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
