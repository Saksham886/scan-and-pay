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

  // Kiosk orders are anonymous, so there may be nothing to send at all. The
  // key is omitted entirely rather than sent as an empty object, since a bare
  // `customer: {}` is not something the API is documented to accept and a
  // rejection here would fail every kiosk order.
  const customer = {
    ...(params.customerName && { name: params.customerName }),
    ...(params.customerPhone && { contact: params.customerPhone }),
    ...(params.customerEmail && { email: params.customerEmail }),
  };

  const payload = {
    amount: params.amount,
    currency: "INR",
    accept_partial: false,
    description: `Order payment (${params.merchantTransactionId})`,
    ...(Object.keys(customer).length > 0 && { customer }),
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

interface CreateUpiQrParams {
  merchantTransactionId: string;
  amount: number; // in paise
  description: string;
  closeBy: number; // epoch seconds; when the QR auto-expires
  credentials?: RazorpayCredentials;
}

/**
 * Creates a single-use dynamic UPI QR code for a fixed amount, rendered
 * natively on the kiosk instead of Razorpay's interactive Standard Checkout.
 *
 * On a shared kiosk the customer pays from their own phone by scanning, so the
 * merchant-confirm screen, the mandatory contact field, and the payment-method
 * picker that Checkout forces are all noise. A dynamic QR skips every one of
 * them: `fixed_amount` locks the total, `close_by` expires the code, and
 * `single_use` auto-closes it after the first successful payment — so a stale
 * or re-scanned QR from an earlier attempt can't quietly collect a second one.
 *
 * The returned `qrId` (prefixed `qr_`) is stored in the same razorpayOrderId
 * column as Standard Checkout's `order_` and Payment Links' `plink_` ids;
 * reconcilePayment tells the three apart by that prefix.
 */
export async function createUpiQr(
  params: CreateUpiQrParams
): Promise<{ success: boolean; qrId?: string; imageUrl?: string; error?: string }> {
  const creds = resolveCredentials(params.credentials);
  if (!creds.keyId || !creds.keySecret) {
    return { success: false, error: "Razorpay is not configured" };
  }

  try {
    const response = await fetch(`${RAZORPAY_BASE_URL}/payments/qr_codes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(creds),
      },
      body: JSON.stringify({
        type: "upi_qr",
        usage: "single_use",
        fixed_amount: true,
        payment_amount: params.amount,
        description: params.description,
        close_by: params.closeBy,
        // Echoed back on the qr_code.credited webhook and readable via the QR
        // payments API — this is what maps a scan back to our order.
        notes: { merchantTxnId: params.merchantTransactionId },
      }),
    });

    const data = await response.json();

    if (response.ok && data.id) {
      return { success: true, qrId: data.id, imageUrl: data.image_url };
    }

    return { success: false, error: data.error?.description || "QR creation failed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "QR creation failed",
    };
  }
}

/**
 * Reconcile status for a dynamic UPI QR. Mirrors fetchOrderPayments: a QR can
 * be scanned more than once before one succeeds, so a single captured payment
 * wins. Deliberately never returns "failed" — an as-yet-uncaptured QR stays
 * "pending" (the kiosk's own timeout ends the wait), so a QR that is still
 * open for another scan is never prematurely marked FAILED against the order.
 */
export async function fetchQrPayments(
  qrId: string,
  credentials?: RazorpayCredentials
): Promise<{ success: boolean; status: "paid" | "failed" | "pending"; paymentId?: string }> {
  const creds = resolveCredentials(credentials);

  try {
    const response = await fetch(`${RAZORPAY_BASE_URL}/payments/qr_codes/${qrId}/payments`, {
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
