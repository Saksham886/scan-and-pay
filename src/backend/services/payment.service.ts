import { paymentRepository } from "@/backend/repositories/payment.repository";
import { orderRepository } from "@/backend/repositories/order.repository";
import { verifyWebhookSignature, checkPaymentStatus } from "@/backend/lib/phonepe";
import {
  verifyWebhookSignature as verifyRazorpayWebhookSignature,
  fetchPaymentLink,
} from "@/backend/lib/razorpay";
import { sseManager } from "@/backend/lib/sse";
import { notifyOrderPlaced } from "@/backend/lib/whatsapp";
import type { Prisma } from "@/generated/prisma";
import { after } from "next/server";

type FullOrder = NonNullable<Awaited<ReturnType<typeof orderRepository.getOrderById>>>;

async function sendOrderPlacedWhatsApp(fullOrder: FullOrder) {
  if (!fullOrder.customerPhone) return;
  try {
    await notifyOrderPlaced({
      customerPhone: fullOrder.customerPhone,
      customerName: fullOrder.customerName || "there",
      orderNumber: fullOrder.orderNumber,
      totalPaise: fullOrder.totalPaise,
      cafeName: fullOrder.cafe?.name || "the cafe",
      items: fullOrder.items.map((i) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        subtotalPaise: i.subtotalPaise,
      })),
    });
  } catch (err) {
    console.error("[WhatsApp] notifyOrderPlaced failed:", err);
  }
}

function broadcastNewOrder(fullOrder: FullOrder) {
  sseManager.sendToCafe(fullOrder.cafeId, "new_order", {
    type: "new_order",
    order: {
      id: fullOrder.id,
      orderNumber: fullOrder.orderNumber,
      status: fullOrder.status,
      totalPaise: fullOrder.totalPaise,
      customerName: fullOrder.customerName,
      customerPhone: fullOrder.customerPhone,
      notes: fullOrder.notes,
      createdAt: fullOrder.createdAt.toISOString(),
      updatedAt: fullOrder.updatedAt.toISOString(),
      cafeId: fullOrder.cafeId,
      cafeName: fullOrder.cafe?.name,
      cafeSlug: fullOrder.cafe?.slug,
      items: fullOrder.items.map((i) => ({
        id: i.id,
        itemName: i.itemName,
        itemPricePaise: i.itemPricePaise,
        quantity: i.quantity,
        subtotalPaise: i.subtotalPaise,
      })),
    },
  });
}

export const paymentService = {
  async handleWebhook(
    body: string,
    xVerifyHeader: string
  ): Promise<{ success: boolean; message: string }> {
    // Step 1: Parse the raw body to extract merchantTransactionId before verifying.
    // We need the txn ID to look up which cafe's salt key to use for verification.
    let decoded: Record<string, unknown>;
    let merchantTxnId: string;
    let base64Response: string;
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      base64Response = parsed.response as string;
      if (!base64Response) return { success: false, message: "Invalid webhook payload" };
      decoded = JSON.parse(Buffer.from(base64Response, "base64").toString()) as Record<string, unknown>;
      const data = decoded.data as Record<string, unknown> | undefined;
      merchantTxnId = data?.merchantTransactionId as string;
      if (!merchantTxnId) {
        return { success: false, message: "Missing merchantTransactionId" };
      }
    } catch {
      return { success: false, message: "Invalid webhook payload" };
    }

    // Step 2: Look up payment to get the associated cafe's salt key
    const payment = await paymentRepository.findByMerchantTxnId(merchantTxnId);
    if (!payment) {
      return { success: false, message: "Payment not found" };
    }

    const cafe = payment.order.cafe;
    const saltKey = process.env.PHONEPE_SALT_KEY || cafe?.phonepeSaltKey || undefined;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || cafe?.phonepeSaltIndex || undefined;

    // Step 3: Verify signature against the base64 response value (not the full raw body)
    if (!verifyWebhookSignature(base64Response, xVerifyHeader, saltKey, saltIndex)) {
      return { success: false, message: "Invalid signature" };
    }

    // Idempotent: already processed
    if (payment.status === "SUCCESS" || payment.status === "REFUNDED") {
      return { success: true, message: "Already processed" };
    }

    const isSuccess = decoded.code === "PAYMENT_SUCCESS";
    const data = decoded.data as Record<string, unknown> | undefined;
    const instrument = data?.paymentInstrument as Record<string, unknown> | undefined;

    // Atomically claim this payment: only proceed if no other concurrent
    // webhook retry has already moved it to a terminal state. Prevents
    // double-broadcasting/double-notifying on duplicate webhook deliveries.
    const won = await paymentRepository.claimPaymentResult(merchantTxnId, {
      status: isSuccess ? "SUCCESS" : "FAILED",
      phonepeTxnId: data?.transactionId as string | undefined,
      paymentMethod: instrument?.type as string | undefined,
      webhookPayload: decoded as Prisma.InputJsonValue,
      paidAt: isSuccess ? new Date() : undefined,
    });
    if (!won) {
      return { success: true, message: "Already processed" };
    }

    const newOrderStatus = isSuccess ? "PAID" : "FAILED";
    const updatedOrder = await orderRepository.updateOrderStatus(
      payment.orderId,
      newOrderStatus as "PAID" | "FAILED"
    );

    if (isSuccess && updatedOrder) {
      const fullOrder = await orderRepository.getOrderById(payment.orderId);
      if (fullOrder) {
        broadcastNewOrder(fullOrder);
        // Scheduled via after() so the WhatsApp API call doesn't block the
        // webhook/reconcile response (PhonePe may retry on slow responses).
        after(() => sendOrderPlacedWhatsApp(fullOrder));
      }
    }

    return { success: true, message: isSuccess ? "Payment confirmed" : "Payment failed" };
  },

  async handleRazorpayWebhook(
    body: string,
    signatureHeader: string
  ): Promise<{ success: boolean; message: string }> {
    let decoded: Record<string, unknown>;
    let merchantTxnId: string;
    try {
      decoded = JSON.parse(body) as Record<string, unknown>;
      const payload = decoded.payload as Record<string, unknown> | undefined;
      const paymentLink = payload?.payment_link as Record<string, unknown> | undefined;
      const linkEntity = paymentLink?.entity as Record<string, unknown> | undefined;
      merchantTxnId = linkEntity?.reference_id as string;
      if (!merchantTxnId) {
        return { success: false, message: "Missing reference_id" };
      }
    } catch {
      return { success: false, message: "Invalid webhook payload" };
    }

    const payment = await paymentRepository.findByMerchantTxnId(merchantTxnId);
    if (!payment) {
      return { success: false, message: "Payment not found" };
    }

    const cafe = payment.order.cafe;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || cafe?.razorpayWebhookSecret || "";

    if (!verifyRazorpayWebhookSignature(body, signatureHeader, secret)) {
      return { success: false, message: "Invalid signature" };
    }

    // Idempotent: already processed
    if (payment.status === "SUCCESS" || payment.status === "REFUNDED") {
      return { success: true, message: "Already processed" };
    }

    const event = decoded.event as string | undefined;
    const failureEvents = ["payment.failed", "payment_link.cancelled", "payment_link.expired"];
    if (event !== "payment_link.paid" && !failureEvents.includes(event || "")) {
      return { success: true, message: "Event ignored" };
    }

    const isSuccess = event === "payment_link.paid";
    const payload = decoded.payload as Record<string, unknown> | undefined;
    const paymentEntity = (payload?.payment as Record<string, unknown> | undefined)?.entity as
      | Record<string, unknown>
      | undefined;

    const won = await paymentRepository.claimPaymentResult(merchantTxnId, {
      status: isSuccess ? "SUCCESS" : "FAILED",
      razorpayPaymentId: paymentEntity?.id as string | undefined,
      paymentMethod: paymentEntity?.method as string | undefined,
      webhookPayload: decoded as Prisma.InputJsonValue,
      paidAt: isSuccess ? new Date() : undefined,
    });
    if (!won) {
      return { success: true, message: "Already processed" };
    }

    const newOrderStatus = isSuccess ? "PAID" : "FAILED";
    const updatedOrder = await orderRepository.updateOrderStatus(
      payment.orderId,
      newOrderStatus as "PAID" | "FAILED"
    );

    if (isSuccess && updatedOrder) {
      const fullOrder = await orderRepository.getOrderById(payment.orderId);
      if (fullOrder) {
        broadcastNewOrder(fullOrder);
        after(() => sendOrderPlacedWhatsApp(fullOrder));
      }
    }

    return { success: true, message: isSuccess ? "Payment confirmed" : "Payment failed" };
  },

  async reconcilePayment(merchantTxnId: string): Promise<"success" | "failed" | "pending" | "already_done"> {
    const payment = await paymentRepository.findByMerchantTxnId(merchantTxnId);
    if (!payment) return "failed";
    if (payment.status === "SUCCESS") return "already_done";
    if (payment.status === "FAILED") return "failed";

    const cafe = payment.order.cafe;

    if (payment.provider === "RAZORPAY") {
      if (!payment.razorpayOrderId) return "pending";

      const razorpayKeyId = process.env.RAZORPAY_KEY_ID || cafe?.razorpayKeyId;
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || cafe?.razorpayKeySecret;
      const razorpayCredentials =
        razorpayKeyId && razorpayKeySecret
          ? { keyId: razorpayKeyId, keySecret: razorpayKeySecret }
          : undefined;

      const linkResult = await fetchPaymentLink(payment.razorpayOrderId, razorpayCredentials);
      if (!linkResult.success) return "pending";
      if (linkResult.status === "created" || linkResult.status === "partially_paid") return "pending";

      const isSuccess = linkResult.status === "paid";
      const linkPayments = linkResult.data?.payments as Array<Record<string, unknown>> | undefined;
      const lastPayment = linkPayments?.[linkPayments.length - 1];

      const won = await paymentRepository.claimPaymentResult(merchantTxnId, {
        status: isSuccess ? "SUCCESS" : "FAILED",
        razorpayPaymentId: lastPayment?.payment_id as string | undefined,
        paidAt: isSuccess ? new Date() : undefined,
      });
      if (!won) return "already_done";

      await orderRepository.updateOrderStatus(payment.orderId, isSuccess ? "PAID" : "FAILED");

      if (isSuccess) {
        const fullOrder = await orderRepository.getOrderById(payment.orderId);
        if (fullOrder) {
          broadcastNewOrder(fullOrder);
          after(() => sendOrderPlacedWhatsApp(fullOrder));
        }
      }

      return isSuccess ? "success" : "failed";
    }

    const merchantId = process.env.PHONEPE_MERCHANT_ID || cafe?.phonepeMerchantId;
    const saltKey = process.env.PHONEPE_SALT_KEY || cafe?.phonepeSaltKey;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || cafe?.phonepeSaltIndex || "1";
    const credentials = merchantId && saltKey
      ? { merchantId, saltKey, saltIndex }
      : undefined;

    const result = await checkPaymentStatus(merchantTxnId, credentials);
    // Network/internal error - treat as transient, caller should retry
    if (result.status === "INTERNAL_ERROR") return "pending";
    // PhonePe explicitly says payment is still pending
    if (result.status === "PAYMENT_PENDING") return "pending";

    const isSuccess = result.status === "PAYMENT_SUCCESS";
    // PhonePe status API wraps data inside result.data.data
    const responseData = (result.data?.data ?? result.data) as Record<string, unknown> | undefined;
    const instrument = responseData?.paymentInstrument as Record<string, unknown> | undefined;

    const won = await paymentRepository.claimPaymentResult(merchantTxnId, {
      status: isSuccess ? "SUCCESS" : "FAILED",
      phonepeTxnId: responseData?.transactionId as string | undefined,
      paymentMethod: instrument?.type as string | undefined,
      paidAt: isSuccess ? new Date() : undefined,
    });
    if (!won) return "already_done";

    await orderRepository.updateOrderStatus(payment.orderId, isSuccess ? "PAID" : "FAILED");

    if (isSuccess) {
      const fullOrder = await orderRepository.getOrderById(payment.orderId);
      if (fullOrder) {
        broadcastNewOrder(fullOrder);
        // Scheduled via after() so the WhatsApp API call doesn't block the
        // webhook/reconcile response (PhonePe may retry on slow responses).
        after(() => sendOrderPlacedWhatsApp(fullOrder));
      }
    }

    return isSuccess ? "success" : "failed";
  },
};
