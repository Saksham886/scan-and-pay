import { paymentRepository } from "@/backend/repositories/payment.repository";
import { orderRepository } from "@/backend/repositories/order.repository";
import { verifyWebhookSignature, checkPaymentStatus } from "@/backend/lib/phonepe";
import {
  verifyWebhookSignature as verifyRazorpayWebhookSignature,
  verifyCheckoutSignature,
  fetchPaymentLink,
  fetchOrderPayments,
  fetchQrPayments,
} from "@/backend/lib/razorpay";
import { broadcastNewOrder, sendOrderPlacedWhatsApp } from "@/backend/lib/order-events";
import type { Prisma } from "@/generated/prisma";
import { after } from "next/server";

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
    const saltKey = cafe?.phonepeSaltKey || process.env.PHONEPE_SALT_KEY || undefined;
    const saltIndex = cafe?.phonepeSaltIndex || process.env.PHONEPE_SALT_INDEX || undefined;

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
      const entity = (payload?.payment as Record<string, unknown> | undefined)?.entity as
        | Record<string, unknown>
        | undefined;
      const notes = entity?.notes as Record<string, unknown> | undefined;
      // qr_code.credited carries the notes on the QR entity, not the payment.
      const qrEntity = (payload?.qr_code as Record<string, unknown> | undefined)?.entity as
        | Record<string, unknown>
        | undefined;
      const qrNotes = qrEntity?.notes as Record<string, unknown> | undefined;
      // Payment Links carry the txn id as reference_id; Standard Checkout
      // orders carry it in the payment's notes (payment.captured doesn't echo
      // the order's receipt field); dynamic QRs carry it in the QR's notes.
      merchantTxnId =
        (linkEntity?.reference_id as string) ||
        (notes?.merchantTxnId as string) ||
        (qrNotes?.merchantTxnId as string);
      if (!merchantTxnId) {
        return { success: false, message: "Missing merchant transaction id" };
      }
    } catch {
      return { success: false, message: "Invalid webhook payload" };
    }

    const payment = await paymentRepository.findByMerchantTxnId(merchantTxnId);
    if (!payment) {
      return { success: false, message: "Payment not found" };
    }

    const cafe = payment.order.cafe;
    const secret = cafe?.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";

    if (!verifyRazorpayWebhookSignature(body, signatureHeader, secret)) {
      return { success: false, message: "Invalid signature" };
    }

    // Idempotent: already processed
    if (payment.status === "SUCCESS" || payment.status === "REFUNDED") {
      return { success: true, message: "Already processed" };
    }

    const event = decoded.event as string | undefined;
    const payload = decoded.payload as Record<string, unknown> | undefined;
    const paymentEntity = (payload?.payment as Record<string, unknown> | undefined)?.entity as
      | Record<string, unknown>
      | undefined;
    const isLinkEvent = payload?.payment_link !== undefined;

    const successEvents = ["payment_link.paid", "payment.captured", "order.paid", "qr_code.credited"];
    // payment.failed is only terminal for a Payment Link, which is dead once
    // it fails. A Standard Checkout order stays open for another attempt, and
    // the kiosk's "Try Again" reopens that same order — marking it FAILED here
    // would lock out the retry that then succeeds. Those are left to
    // reconcilePayment and the client's own timeout instead.
    const failureEvents = isLinkEvent
      ? ["payment.failed", "payment_link.cancelled", "payment_link.expired"]
      : [];
    if (!successEvents.includes(event || "") && !failureEvents.includes(event || "")) {
      return { success: true, message: "Event ignored" };
    }

    const isSuccess = successEvents.includes(event || "");

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

  /**
   * Confirms a Standard Checkout payment straight from Checkout's success
   * handler. Webhook delivery routinely lags by seconds, which on a kiosk is
   * the difference between the customer collecting their receipt and standing
   * in front of a spinner — so the signature settles the payment here, and
   * the webhook that follows lands on the "already processed" path.
   */
  async verifyCheckoutPayment(args: {
    merchantTxnId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    signature: string;
  }): Promise<{ success: boolean; message: string }> {
    const payment = await paymentRepository.findByMerchantTxnId(args.merchantTxnId);
    if (!payment) {
      return { success: false, message: "Payment not found" };
    }
    // A valid signature only proves *some* Razorpay order was paid. Binding it
    // to the order we recorded stops a signature from one payment being
    // replayed to settle a different (larger) one.
    if (payment.razorpayOrderId !== args.razorpayOrderId) {
      return { success: false, message: "Order mismatch" };
    }
    if (payment.status === "SUCCESS" || payment.status === "REFUNDED") {
      return { success: true, message: "Already processed" };
    }

    const cafe = payment.order.cafe;
    const secret = cafe?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";
    if (
      !verifyCheckoutSignature(
        args.razorpayOrderId,
        args.razorpayPaymentId,
        args.signature,
        secret
      )
    ) {
      return { success: false, message: "Invalid signature" };
    }

    const won = await paymentRepository.claimPaymentResult(args.merchantTxnId, {
      status: "SUCCESS",
      razorpayPaymentId: args.razorpayPaymentId,
      paidAt: new Date(),
    });
    if (!won) {
      return { success: true, message: "Already processed" };
    }

    await orderRepository.updateOrderStatus(payment.orderId, "PAID");

    const fullOrder = await orderRepository.getOrderById(payment.orderId);
    if (fullOrder) {
      broadcastNewOrder(fullOrder);
      after(() => sendOrderPlacedWhatsApp(fullOrder));
    }

    return { success: true, message: "Payment confirmed" };
  },

  async reconcilePayment(merchantTxnId: string): Promise<"success" | "failed" | "pending" | "already_done"> {
    const payment = await paymentRepository.findByMerchantTxnId(merchantTxnId);
    if (!payment) return "failed";
    if (payment.status === "SUCCESS") return "already_done";
    if (payment.status === "FAILED") return "failed";

    const cafe = payment.order.cafe;

    if (payment.provider === "RAZORPAY") {
      if (!payment.razorpayOrderId) return "pending";

      const razorpayKeyId = cafe?.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = cafe?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;
      const razorpayCredentials =
        razorpayKeyId && razorpayKeySecret
          ? { keyId: razorpayKeyId, keySecret: razorpayKeySecret }
          : undefined;

      // Standard Checkout orders come back as `order_…`, dynamic UPI QRs as
      // `qr_…`, and the older hosted Payment Links as `plink_…`. Discriminating
      // on the prefix keeps anything still in flight across a deploy (or a
      // flag flip) reconciling against the right API.
      const isCheckoutOrder = payment.razorpayOrderId.startsWith("order_");
      const isQr = payment.razorpayOrderId.startsWith("qr_");

      let isSuccess: boolean;
      let razorpayPaymentId: string | undefined;

      if (isQr) {
        const qrResult = await fetchQrPayments(payment.razorpayOrderId, razorpayCredentials);
        if (!qrResult.success || qrResult.status === "pending") return "pending";
        isSuccess = qrResult.status === "paid";
        razorpayPaymentId = qrResult.paymentId;
      } else if (isCheckoutOrder) {
        const orderResult = await fetchOrderPayments(payment.razorpayOrderId, razorpayCredentials);
        if (!orderResult.success || orderResult.status === "pending") return "pending";
        isSuccess = orderResult.status === "paid";
        razorpayPaymentId = orderResult.paymentId;
      } else {
        const linkResult = await fetchPaymentLink(payment.razorpayOrderId, razorpayCredentials);
        if (!linkResult.success) return "pending";
        if (linkResult.status === "created" || linkResult.status === "partially_paid") return "pending";

        isSuccess = linkResult.status === "paid";
        const linkPayments = linkResult.data?.payments as Array<Record<string, unknown>> | undefined;
        const lastPayment = linkPayments?.[linkPayments.length - 1];
        razorpayPaymentId = lastPayment?.payment_id as string | undefined;
      }

      const won = await paymentRepository.claimPaymentResult(merchantTxnId, {
        status: isSuccess ? "SUCCESS" : "FAILED",
        razorpayPaymentId,
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

    const merchantId = cafe?.phonepeMerchantId || process.env.PHONEPE_MERCHANT_ID;
    const saltKey = cafe?.phonepeSaltKey || process.env.PHONEPE_SALT_KEY;
    const saltIndex = cafe?.phonepeSaltIndex || process.env.PHONEPE_SALT_INDEX || "1";
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
