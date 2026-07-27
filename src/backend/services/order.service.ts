import { menuRepository } from "@/backend/repositories/menu.repository";
import { orderRepository } from "@/backend/repositories/order.repository";
import { paymentRepository } from "@/backend/repositories/payment.repository";
import { generateOrderNumber } from "@/backend/lib/utils/order-number";
import { initiatePayment } from "@/backend/lib/phonepe";
import { createPaymentLink } from "@/backend/lib/razorpay";
import { sseManager } from "@/backend/lib/sse";
import { broadcastNewOrder, sendOrderPlacedWhatsApp } from "@/backend/lib/order-events";
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

    // Resolve the active menu server-side — never trust a client-supplied
    // menu id, so a stale tab can't order against a since-deactivated menu.
    const activeMenu = await menuRepository.getActiveMenu(cafe.id);
    if (!activeMenu) {
      throw new Error("Cafe is not accepting orders right now");
    }

    // Validate items and fetch current prices, scoped to the active menu
    const itemIds = request.items.map((i) => i.menuItemId);
    const menuItems = await menuRepository.getMenuItemsByMenuId(itemIds, activeMenu.id, activeMenu.type);

    if (menuItems.length !== request.items.length) {
      throw new Error("One or more items are unavailable or do not belong to this cafe");
    }

    const menuItemMap = new Map(menuItems.map((mi) => [mi.id, mi]));

    // Build order items with snapshotted prices. A line is subsidised if
    // either the whole menu is subsidised or the item itself is (an owner
    // can mark individual items free on an otherwise-paid menu) — this can
    // produce a mixed cart where only some lines are actually charged.
    const orderItems = request.items.map((reqItem) => {
      const menuItem = menuItemMap.get(reqItem.menuItemId)!;
      return {
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        itemPricePaise: menuItem.pricePaise,
        quantity: reqItem.quantity,
        subtotalPaise: menuItem.pricePaise * reqItem.quantity,
        isSubsidised: activeMenu.isSubsidised || menuItem.isSubsidised,
      };
    });

    const totalPaise = orderItems.reduce((sum, i) => sum + i.subtotalPaise, 0);
    // What's actually collected from the customer — excludes subsidised
    // lines. totalPaise stays the full catalog value for record-keeping.
    const chargeableTotal = orderItems.reduce((sum, i) => sum + (i.isSubsidised ? 0 : i.subtotalPaise), 0);

    if (totalPaise <= 0) {
      throw new Error("Order total must be greater than zero");
    }

    const provider = cafe.paymentProvider;

    // Nothing to charge (whole menu subsidised, or every individual item
    // is) skips all payment-provider checks up front — the cafe may not
    // even have a gateway configured for these orders.
    let merchantId: string | undefined;
    let saltKey: string | undefined;
    let saltIndex: string | undefined;
    let cafeCredentials: { merchantId: string; saltKey: string; saltIndex: string } | undefined;
    let razorpayCredentials: { keyId: string; keySecret: string } | undefined;

    if (chargeableTotal > 0) {
      const isTestMode = process.env.PHONEPE_TEST_MODE === "true";
      // Cafe-specific credentials always win — .env is only a last-resort
      // fallback (e.g. a single-tenant dev setup), never allowed to override
      // a cafe's own gateway config or silently absorb an unconfigured cafe's
      // payments into whichever account happens to be in .env.
      merchantId = cafe.phonepeMerchantId || process.env.PHONEPE_MERCHANT_ID || undefined;
      saltKey = cafe.phonepeSaltKey || process.env.PHONEPE_SALT_KEY || undefined;
      saltIndex = cafe.phonepeSaltIndex || process.env.PHONEPE_SALT_INDEX || "1";

      if (provider === "PHONEPE" && !isTestMode && (!merchantId || !saltKey)) {
        throw new Error("Payment is not configured for this cafe. Please contact support.");
      }

      cafeCredentials = merchantId && saltKey ? { merchantId, saltKey, saltIndex } : undefined;

      const razorpayKeyId = cafe.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = cafe.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;

      if (provider === "RAZORPAY" && (!razorpayKeyId || !razorpayKeySecret)) {
        throw new Error("Payment is not configured for this cafe. Please contact support.");
      }

      razorpayCredentials =
        razorpayKeyId && razorpayKeySecret
          ? { keyId: razorpayKeyId, keySecret: razorpayKeySecret }
          : undefined;
    }

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

    if (chargeableTotal === 0) {
      // No payment to collect: lands straight in the Incoming queue, same as
      // a paid order once its payment succeeds — still needs staff to
      // prepare and hand it over, then mark it Completed.
      await orderRepository.updateOrderStatus(order.id, "PAID");
      const fullOrder = await orderRepository.getOrderById(order.id);
      if (fullOrder) {
        broadcastNewOrder(fullOrder);
        after(() => sendOrderPlacedWhatsApp(fullOrder));
      }
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalPaise,
        paymentRedirectUrl: "",
      };
    }

    // Create payment and initiate it with the cafe's configured gateway —
    // only the chargeable (non-subsidised) portion is collected.
    const merchantTxnId = `ORD-${order.id.slice(0, 8)}-${uuid().slice(0, 8)}`;

    await paymentRepository.createPayment({
      orderId: order.id,
      amountPaise: chargeableTotal,
      merchantTxnId,
      phonepeMerchantId: merchantId ?? undefined,
      provider,
    });

    const returnUrl = `${APP_URL}/${cafe.slug}/order/payment-return?txn=${merchantTxnId}&orderId=${order.id}`;

    const paymentResult =
      provider === "RAZORPAY"
        ? await createPaymentLink({
            merchantTransactionId: merchantTxnId,
            amount: chargeableTotal,
            callbackUrl: returnUrl,
            customerName: request.customerName,
            customerPhone: request.customerPhone,
            customerEmail: request.customerEmail,
            credentials: razorpayCredentials,
          })
        : await initiatePayment({
            merchantTransactionId: merchantTxnId,
            amount: chargeableTotal,
            redirectUrl: returnUrl,
            callbackUrl: `${APP_URL}/api/webhooks/phonepe`,
            customerPhone: request.customerPhone,
            credentials: cafeCredentials,
          });

    if (!paymentResult.success || !paymentResult.redirectUrl) {
      // Update order to failed if payment initiation fails
      await orderRepository.updateOrderStatus(order.id, "FAILED");
      throw new Error(paymentResult.error || "Failed to initiate payment");
    }

    const razorpayOrderId =
      provider === "RAZORPAY" ? (paymentResult as { razorpayOrderId?: string }).razorpayOrderId : undefined;
    if (razorpayOrderId) {
      await paymentRepository.attachRazorpayOrderId(merchantTxnId, razorpayOrderId);
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
      cafeName: order.cafe?.name ?? null,
      // Fully subsidised orders never get a Payment row (createOrder skips it
      // entirely for the no-payment path) — that absence is the signal after
      // the fact. For mixed orders a Payment row exists (for the chargeable
      // portion), so this is only true when nothing at all was charged.
      isSubsidised: order.payments.length === 0,
      // What was actually collected — equals totalPaise when nothing on the
      // order was subsidised, 0 when everything was, and the partial amount
      // for a mixed cart.
      chargeablePaise: order.items.reduce((sum, i) => sum + (i.isSubsidised ? 0 : i.subtotalPaise), 0),
      items: order.items.map((i) => ({
        id: i.id,
        itemName: i.itemName,
        itemPricePaise: i.itemPricePaise,
        quantity: i.quantity,
        subtotalPaise: i.subtotalPaise,
        isSubsidised: i.isSubsidised,
      })),
    };
  },

  async submitFeedback(orderId: string, rating: number) {
    const order = await orderRepository.getOrderById(orderId);
    if (!order) throw new Error("Order not found");
    if (!order.status || !["PAID", "PREPARING", "READY", "COMPLETED"].includes(order.status)) {
      throw new Error("Order has not been paid yet");
    }
    await orderRepository.setRating(orderId, rating);
  },

  async updateOrderStatus(orderId: string, status: string, cafeId?: string) {
    const order = await orderRepository.getOrderById(orderId);
    if (!order) throw new Error("Order not found");
    if (cafeId && order.cafeId !== cafeId) throw new Error("Unauthorized");

    // Validate state transition. Orders land on PAID (the "Incoming" queue)
    // directly — either once a gateway payment succeeds, or immediately for
    // a fully subsidised order — and staff manually mark them Completed
    // (fulfilled/handed over) or Cancel them. Both are terminal from there.
    const validTransitions: Record<string, string[]> = {
      PAYMENT_PENDING: ["CANCELLED"],
      PAID: ["COMPLETED", "CANCELLED"],
      // Legacy: orders that reached an intermediate status before this pivot
      // (no new order will land here going forward) must still be cancellable.
      PREPARING: ["CANCELLED"],
      READY: ["CANCELLED"],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      throw new Error(`Cannot transition from ${order.status} to ${status}`);
    }

    const updated = await orderRepository.updateOrderStatus(orderId, status as "COMPLETED" | "CANCELLED");

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
        cafeName: order.cafe?.name ?? null,
        cafeSlug: order.cafe?.slug,
        isSubsidised: updated.payments.length === 0,
        chargeablePaise: updated.items.reduce((sum, i) => sum + (i.isSubsidised ? 0 : i.subtotalPaise), 0),
        items: updated.items.map((i) => ({
          id: i.id,
          itemName: i.itemName,
          itemPricePaise: i.itemPricePaise,
          quantity: i.quantity,
          subtotalPaise: i.subtotalPaise,
          isSubsidised: i.isSubsidised,
        })),
      },
    });

    return updated;
  },
};
