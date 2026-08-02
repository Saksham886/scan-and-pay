import { createHmac } from "crypto";

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";
const GLOBAL_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const GLOBAL_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

function resolveCredentials(override?: RazorpayCredentials): RazorpayCredentials {
  return {
    keyId: override?.keyId || GLOBAL_KEY_ID,
    keySecret: override?.keySecret || GLOBAL_KEY_SECRET,
  };
}

function authHeader(creds: RazorpayCredentials): string {
  return "Basic " + Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64");
}

interface CreatePaymentLinkParams {
  merchantTransactionId: string;
  amount: number; // in paise
  callbackUrl: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  credentials?: RazorpayCredentials;
}

interface RazorpayPaymentLinkResponse {
  success: boolean;
  redirectUrl?: string;
  razorpayOrderId?: string;
  error?: string;
}

export async function createPaymentLink(
  params: CreatePaymentLinkParams
): Promise<RazorpayPaymentLinkResponse> {
  const creds = resolveCredentials(params.credentials);
  if (!creds.keyId || !creds.keySecret) {
    return { success: false, error: "Razorpay is not configured" };
  }

  const payload = {
    amount: params.amount,
    currency: "INR",
    accept_partial: false,
    description: `Order payment (${params.merchantTransactionId})`,
    customer: {
      ...(params.customerName && { name: params.customerName }),
      ...(params.customerPhone && { contact: params.customerPhone }),
      ...(params.customerEmail && { email: params.customerEmail }),
    },
    notify: { sms: false, email: false },
    reminder_enable: false,
    callback_url: params.callbackUrl,
    callback_method: "get",
    reference_id: params.merchantTransactionId,
  };

  try {
    const response = await fetch(`${RAZORPAY_BASE_URL}/payment_links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(creds),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.short_url) {
      return { success: true, redirectUrl: data.short_url, razorpayOrderId: data.id };
    }

    return { success: false, error: data.error?.description || "Payment link creation failed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Payment link creation failed",
    };
  }
}

interface CreateCheckoutOrderParams {
  merchantTransactionId: string;
  amount: number; // in paise
  credentials?: RazorpayCredentials;
}

/**
 * Creates a Razorpay Order for Standard Checkout, as opposed to the hosted
 * Payment Link above. Razorpay deliberately does not autofill contact/email
 * on a Payment Link's hosted page even when the customer object carries
 * them, which forced kiosk customers to retype details they had already
 * entered. Standard Checkout is opened from our own page, so those fields
 * can be prefilled and locked (or hidden outright once Razorpay Support
 * enables it for the account).
 */
export async function createCheckoutOrder(
  params: CreateCheckoutOrderParams
): Promise<{ success: boolean; razorpayOrderId?: string; error?: string }> {
  const creds = resolveCredentials(params.credentials);
  if (!creds.keyId || !creds.keySecret) {
    return { success: false, error: "Razorpay is not configured" };
  }

  try {
    const response = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(creds),
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: "INR",
        // Both carry the merchant txn id: `receipt` is what shows on the
        // Razorpay dashboard for reconciliation, `notes` is what comes back
        // on payment.captured webhooks (which don't echo `receipt`).
        receipt: params.merchantTransactionId,
        notes: { merchantTxnId: params.merchantTransactionId },
      }),
    });

    const data = await response.json();

    if (response.ok && data.id) {
      return { success: true, razorpayOrderId: data.id };
    }

    return { success: false, error: data.error?.description || "Order creation failed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Order creation failed",
    };
  }
}

/**
 * Reconcile status for a Standard Checkout order. A single order can carry
 * several attempts (a failed card, then a successful UPI), so one captured
 * payment wins regardless of how many failed before it.
 */
export async function fetchOrderPayments(
  razorpayOrderId: string,
  credentials?: RazorpayCredentials
): Promise<{ success: boolean; status: "paid" | "failed" | "pending"; paymentId?: string }> {
  const creds = resolveCredentials(credentials);

  try {
    const response = await fetch(`${RAZORPAY_BASE_URL}/orders/${razorpayOrderId}/payments`, {
      method: "GET",
      headers: { Authorization: authHeader(creds) },
    });

    const data = await response.json();
    if (!response.ok) return { success: false, status: "pending" };

    const items = (data.items || []) as Array<Record<string, unknown>>;
    const captured = items.find((p) => p.status === "captured");
    if (captured) {
      return { success: true, status: "paid", paymentId: captured.id as string };
    }
    // An `authorized` payment is money held but not taken, so it stays
    // pending here and is settled by the payment.captured webhook rather
    // than being optimistically marked PAID.
    if (items.length > 0 && items.every((p) => p.status === "failed")) {
      return { success: true, status: "failed" };
    }
    return { success: true, status: "pending" };
  } catch {
    return { success: false, status: "pending" };
  }
}

/**
 * Verifies the signature Checkout hands back in its success handler. This is
 * the fast confirmation path — it lets the kiosk show "paid" immediately
 * instead of waiting on webhook delivery.
 */
export function verifyCheckoutSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return expected === signature;
}

export async function fetchPaymentLink(
  razorpayOrderId: string,
  credentials?: RazorpayCredentials
): Promise<{ success: boolean; status: string; data?: Record<string, unknown> }> {
  const creds = resolveCredentials(credentials);

  try {
    const response = await fetch(`${RAZORPAY_BASE_URL}/payment_links/${razorpayOrderId}`, {
      method: "GET",
      headers: { Authorization: authHeader(creds) },
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, status: "INTERNAL_ERROR", data };
    }

    return { success: true, status: data.status, data };
  } catch {
    return { success: false, status: "INTERNAL_ERROR" };
  }
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  if (!secret || !signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signatureHeader;
}
