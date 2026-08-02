import { NextResponse } from "next/server";
import { orderService } from "@/backend/services/order.service";
import type { CreateOrderRequest } from "@/shared/types";
import {
  normalizePhone,
  validateEmail,
  validateName,
  validatePhone,
} from "@/shared/utils/validation";
import { rateLimitResponse, getClientIp } from "@/backend/lib/rate-limit";
import { corsPreflightResponse } from "@/backend/lib/cors";

const MAX_ITEMS_PER_ORDER = 50;
const MAX_QTY_PER_ITEM = 99;
const MAX_NOTES_LEN = 500;

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function POST(request: Request) {
  try {
    // Per-IP rate limit: 10 orders / minute, 60 / hour.
    const ip = getClientIp(request);
    const burst = await rateLimitResponse(`order-create-burst:${ip}`, { max: 10, windowMs: 60 * 1000 });
    if (burst) return burst;
    const sustained = await rateLimitResponse(`order-create-hour:${ip}`, { max: 60, windowMs: 60 * 60 * 1000 });
    if (sustained) return sustained;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
    }

    const body = raw as CreateOrderRequest;

    if (
      typeof body.cafeSlug !== "string" ||
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      typeof body.idempotencyKey !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: cafeSlug, items, idempotencyKey" },
        { status: 400 }
      );
    }

    if (body.cafeSlug.length > 80 || !/^[a-z0-9-]+$/.test(body.cafeSlug)) {
      return NextResponse.json({ success: false, error: "Invalid cafeSlug" }, { status: 400 });
    }
    if (body.idempotencyKey.length < 8 || body.idempotencyKey.length > 128) {
      return NextResponse.json({ success: false, error: "Invalid idempotencyKey" }, { status: 400 });
    }

    if (body.items.length > MAX_ITEMS_PER_ORDER) {
      return NextResponse.json(
        { success: false, error: `Order cannot exceed ${MAX_ITEMS_PER_ORDER} line items` },
        { status: 400 }
      );
    }

    if (body.notes !== undefined && body.notes !== null) {
      if (typeof body.notes !== "string" || body.notes.length > MAX_NOTES_LEN) {
        return NextResponse.json({ success: false, error: "notes too long" }, { status: 400 });
      }
    }

    // All three are optional: kiosk orders are anonymous, so the customer
    // types nothing and none of them arrive. Whatever *is* supplied still has
    // to be valid, which keeps the web checkout — which sends all three and
    // validates them client-side first — behaving exactly as before.
    const rawName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    if (rawName) {
      const nameCheck = validateName(rawName);
      if (!nameCheck.valid) {
        return NextResponse.json({ success: false, error: nameCheck.error }, { status: 400 });
      }
    }
    const rawPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    if (rawPhone) {
      const phoneCheck = validatePhone(rawPhone);
      if (!phoneCheck.valid) {
        return NextResponse.json({ success: false, error: phoneCheck.error }, { status: 400 });
      }
    }
    const rawEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
    if (rawEmail) {
      const emailCheck = validateEmail(rawEmail);
      if (!emailCheck.valid) {
        return NextResponse.json({ success: false, error: emailCheck.error }, { status: 400 });
      }
    }

    body.customerName = rawName || undefined;
    body.customerPhone = rawPhone ? normalizePhone(rawPhone) : undefined;
    body.customerEmail = rawEmail ? rawEmail.toLowerCase() : undefined;

    for (const item of body.items) {
      if (
        !item ||
        typeof item.menuItemId !== "string" ||
        item.menuItemId.length === 0 ||
        item.menuItemId.length > 64 ||
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > MAX_QTY_PER_ITEM
      ) {
        return NextResponse.json(
          { success: false, error: "Each item must have a valid menuItemId and quantity 1-99" },
          { status: 400 }
        );
      }
    }

    const result = await orderService.createOrder(body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    const status = message.includes("not found") || message.includes("unavailable")
      ? 422
      : message.includes("inactive")
        ? 403
        : 500;

    // Only echo error message back if it's a known business error
    const safeMsg = status === 500 ? "Failed to create order" : message;
    if (status === 500) {
      console.error("[POST /api/orders] unexpected error:", error);
    }
    return NextResponse.json({ success: false, error: safeMsg }, { status });
  }
}
