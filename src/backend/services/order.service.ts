import { menuRepository } from "@/backend/repositories/menu.repository";
import { orderRepository } from "@/backend/repositories/order.repository";
import { paymentRepository } from "@/backend/repositories/payment.repository";
import { adminRepository } from "@/backend/repositories/admin.repository";
import { generateOrderNumber } from "@/backend/lib/utils/order-number";
import { initiatePayment } from "@/backend/lib/phonepe";
import { sseManager } from "@/backend/lib/sse";
import { notifyOrderReady } from "@/backend/lib/whatsapp";
import type { CreateOrderRequest, CreateOrderResponse, OrderSummary } from "@/shared/types";
import { v4 as uuid } from "uuid";
import { after } from "next/server";
import { Prisma } from "@/generated/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;

type ExistingOrder = NonNullable<Awaited<ReturnType<typeof orderRepository.findByIdempotencyKey>>>;

function existingOrderResponse(existing: ExistingOrder): CreateOrderResponse {
  const existingPayment = existing.payments[0];
  if (!existingPayment) {
    throw new Error("Order exists but no payment found");
  }
  return {
    orderId: existing.id,
    orderNumber: existing.orderNumber,
    totalPaise: existing.totalPaise,
    paymentRedirectUrl: "", // Caller should handle re-initiation
  };
}

function isIdempotencyKeyConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return false;
  }
  // The @prisma/adapter-pg driver adapter nests the violated constraint's
  // field names under meta.driverAdapterError.cause.constraint.fields
  // rather than the classic engine's flat meta.target array, and that
  // shape isn't part of the public type surface. Match broadly against
  // the serialized meta instead of relying on one fixed property path.
  return JSON.stringify(err.meta ?? {}).toLowerCase().includes("idempotency");
}

// Two observed transient failure modes under a concurrent burst against a
// small DB compute: the pool has no free connection within
// connectionTimeoutMillis (db.ts), or Neon is briefly unreachable (the same
// cold-start reachability blip seen throughout this project's scripts).
// Both fail before any write is attempted, so retrying is safe.
function isTransientDbError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (/timeout exceeded when trying to connect/i.test(err.message) ||
      /can't reach database server/i.test(err.message))
  );
}

async function withTransientRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !isTransientDbError(err)) throw err;
      await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
    }
  }
}

export const orderService = {
  async createOrder(
    request: CreateOrderRequest
  ): Promise<CreateOrderResponse> {
    // Check idempotency
    const existing = await withTransientRetry(() =>
      orderRepository.findByIdempotencyKey(request.idempotencyKey)
    );
    if (existing) {
      return existingOrderResponse(existing);
    }

    // Resolve cafe
    const cafe = await menuRepository.getCafeBySlug(request.cafeSlug);
    if (!cafe || !cafe.isActive) {
      throw new Error("Cafe not found or inactive");
    }

    // Validate items and fetch current prices
    const itemIds = request.items.map((i) => i.menuItemId);
    const menuItems = await menuRepository.getMenuItemsByIds(itemIds, cafe.id);

    if (menuItems.length !== request.items.length) {
      throw new Error("One or more items are unavailable or do not belong to this cafe");
    }

    const menuItemMap = new Map(menuItems.map((mi) => [mi.id, mi]));

    // Build order items with snapshotted prices
    const orderItems = request.items.map((reqItem) => {
      const menuItem = menuItemMap.get(reqItem.menuItemId)!;
      return {
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        itemPricePaise: menuItem.pricePaise,
        quantity: reqItem.quantity,
        subtotalPaise: menuItem.pricePaise * reqItem.quantity,
      };
    });

    const totalPaise = orderItems.reduce((sum, i) => sum + i.subtotalPaise, 0);

    if (totalPaise <= 0) {
      throw new Error("Order total must be greater than zero");
    }

    const isTestMode = process.env.PHONEPE_TEST_MODE === "true";
    const merchantId = process.env.PHONEPE_MERCHANT_ID || cafe.phonepeMerchantId;
    const saltKey = process.env.PHONEPE_SALT_KEY || cafe.phonepeSaltKey;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || cafe.phonepeSaltIndex || "1";

    if (!isTestMode && (!merchantId || !saltKey)) {
      throw new Error("Payment is not configured for this cafe. Please contact support.");
    }

    const cafeCredentials = merchantId && saltKey ? { merchantId, saltKey, saltIndex } : undefined;

    // Generate order number
    const orderNumber = await generateOrderNumber(cafe.id, cafe.slug);

    // Create order in DB
    const orderData = {
      cafeId: cafe.id,
      orderNumber,
      totalPaise,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerEmail: request.customerEmail,
      notes: request.notes,
      idempotencyKey: request.idempotencyKey,
      items: orderItems,
    };

    let order;
    try {
      order = await withTransientRetry(() => orderRepository.createOrder(orderData));
    } catch (err) {
      // A concurrent request with the same idempotencyKey (e.g. a client
      // retry racing a slow-but-successful first attempt) can win the
      // unique constraint before this one. Return the winner's order
      // instead of surfacing a false "failed to create order" error.
      if (isIdempotencyKeyConflict(err)) {
        const raced = await withTransientRetry(() =>
          orderRepository.findByIdempotencyKey(request.idempotencyKey)
        );
        if (raced) return existingOrderResponse(raced);
      }
      throw err;
    }

    // Create payment and initiate PhonePe
    const merchantTxnId = `ORD-${order.id.slice(0, 8)}-${uuid().slice(0, 8)}`;

    await paymentRepository.createPayment({
      orderId: order.id,
      amountPaise: totalPaise,
      merchantTxnId,
      phonepeMerchantId: merchantId ?? undefined,
    });

    const paymentResult = await initiatePayment({
      merchantTransactionId: merchantTxnId,
      amount: totalPaise,
      redirectUrl: `${APP_URL}/${cafe.slug}/order/payment-return?txn=${merchantTxnId}&orderId=${order.id}`,
      callbackUrl: `${APP_URL}/api/webhooks/phonepe`,
      customerPhone: request.customerPhone,
      credentials: cafeCredentials,
    });

    if (!paymentResult.success || !paymentResult.redirectUrl) {
      // Update order to failed if payment initiation fails
      await orderRepository.updateOrderStatus(order.id, "FAILED");
      throw new Error(paymentResult.error || "Failed to initiate payment");
    }

    // Update order status to PAYMENT_PENDING
    await orderRepository.updateOrderStatus(order.id, "PAYMENT_PENDING");

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalPaise,
      paymentRedirectUrl: paymentResult.redirectUrl,
    };
  },

  async getOrderStatus(orderId: string): Promise<OrderSummary | null> {
    const order = await orderRepository.getOrderById(orderId);
    if (!order) return null;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalPaise: order.totalPaise,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
        id: i.id,
        itemName: i.itemName,
        itemPricePaise: i.itemPricePaise,
        quantity: i.quantity,
        subtotalPaise: i.subtotalPaise,
      })),
    };
  },

  async updateOrderStatus(orderId: string, status: string, cafeId?: string) {
    const order = await orderRepository.getOrderById(orderId);
    if (!order) throw new Error("Order not found");
    if (cafeId && order.cafeId !== cafeId) throw new Error("Unauthorized");

    // Validate state transition
    const validTransitions: Record<string, string[]> = {
      PAID: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY", "CANCELLED"],
      READY: ["COMPLETED", "CANCELLED"],
      PAYMENT_PENDING: ["CANCELLED"],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      throw new Error(`Cannot transition from ${order.status} to ${status}`);
    }

    const updated = await orderRepository.updateOrderStatus(
      orderId,
      status as "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
    );

    // Send WhatsApp message when order is ready for pickup. Scheduled via
    // after() so the notification API call doesn't block this response.
    if (status === "READY" && updated.customerPhone) {
      const customerPhone = updated.customerPhone;
      const customerName = updated.customerName || "there";
      const orderNumber = updated.orderNumber;
      const cafeId = updated.cafeId;
      after(async () => {
        try {
          const cafe = await adminRepository.getCafeById(cafeId);
          await notifyOrderReady({
            customerPhone,
            customerName,
            orderNumber,
            cafeName: cafe?.name || "the cafe",
          });
        } catch (err) {
          console.error("[WhatsApp] notifyOrderReady failed:", err);
        }
      });
    }

    // Push SSE event
    sseManager.sendToCafe(order.cafeId, "order_updated", {
      type: "order_updated",
      order: {
        id: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        totalPaise: updated.totalPaise,
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        cafeId: order.cafeId,
        cafeName: order.cafe?.name,
        cafeSlug: order.cafe?.slug,
        items: updated.items.map((i) => ({
          id: i.id,
          itemName: i.itemName,
          itemPricePaise: i.itemPricePaise,
          quantity: i.quantity,
          subtotalPaise: i.subtotalPaise,
        })),
      },
    });

    return updated;
  },
};
