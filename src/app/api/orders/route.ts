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

const MAX_ITEMS_PER_ORDER = 50;
const MAX_QTY_PER_ITEM = 99;
const MAX_NOTES_LEN = 500;

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

    const nameCheck = validateName(body.customerName ?? "");
    if (!nameCheck.valid) {
      return NextResponse.json({ success: false, error: nameCheck.error }, { status: 400 });
    }
    const phoneCheck = validatePhone(body.customerPhone ?? "");
    if (!phoneCheck.valid) {
      return NextResponse.json({ success: false, error: phoneCheck.error }, { status: 400 });
    }
    const emailCheck = validateEmail(body.customerEmail ?? "");
    if (!emailCheck.valid) {
      return NextResponse.json({ success: false, error: emailCheck.error }, { status: 400 });
    }

    body.customerName = body.customerName!.trim();
    body.customerPhone = normalizePhone(body.customerPhone!);
    body.customerEmail = body.customerEmail!.trim().toLowerCase();

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
    return NextResponse.json({ success: false, error: safeMsg }, { status });
  }
}
