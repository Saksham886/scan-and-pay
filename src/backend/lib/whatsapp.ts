/**
 * WhatsApp utility for sending order confirmations.
 *
 * Currently uses a console-log stub. To enable real WhatsApp delivery:
 * 1. Set WHATSAPP_PROVIDER=twilio (or meta) in .env
 * 2. Set provider-specific env vars
 *    - twilio: TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. "whatsapp:+14155238886")
 *    - meta:   META_WHATSAPP_PHONE_NUMBER_ID, META_WHATSAPP_ACCESS_TOKEN
 */

interface WhatsAppPayload {
  to: string; // Indian 10-digit phone, with or without +91
  message: string;
}

interface OrderItemSummary {
  itemName: string;
  quantity: number;
  subtotalPaise: number;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

function formatRupees(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function sendWhatsApp({ to, message }: WhatsAppPayload): Promise<boolean> {
  const phone = normalizePhone(to);
  const provider = process.env.WHATSAPP_PROVIDER;

  if (!provider) {
    console.log(`[WhatsApp Stub] To: ${phone}\n${message}`);
    return true;
  }

  try {
    switch (provider) {
      case "twilio":
        return await sendViaTwilio(phone, message);
      case "meta":
        return await sendViaMeta(phone, message);
      default:
        console.warn(`[WhatsApp] Unknown provider: ${provider}, falling back to stub`);
        console.log(`[WhatsApp Stub] To: ${phone}\n${message}`);
        return true;
    }
  } catch (error) {
    console.error("[WhatsApp] Failed to send:", error);
    return false;
  }
}

async function sendViaTwilio(to: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.error("[WhatsApp] Twilio credentials not configured");
    return false;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      To: `whatsapp:${to}`,
      From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      Body: message,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[WhatsApp] Twilio error:", res.status, body);
    return false;
  }
  return true;
}

async function sendViaMeta(to: string, message: string): Promise<boolean> {
  return postToMeta({
    messaging_product: "whatsapp",
    to: to.replace(/^\+/, ""),
    type: "text",
    text: { body: message },
  });
}

async function sendMetaTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[]
): Promise<boolean> {
  return postToMeta({
    messaging_product: "whatsapp",
    to: to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: bodyParams.map((text) => ({ type: "text", text })),
        },
      ],
    },
  });
}

async function postToMeta(payload: Record<string, unknown>): Promise<boolean> {
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error("[WhatsApp] Meta credentials not configured");
    return false;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[WhatsApp] Meta error:", res.status, body);
    return false;
  }
  return true;
}

/** Send order confirmation WhatsApp message immediately after payment success */
export async function notifyOrderPlaced(args: {
  customerPhone: string;
  customerName: string;
  orderNumber: string;
  totalPaise: number;
  cafeName: string;
  items: OrderItemSummary[];
}): Promise<boolean> {
  const { customerPhone, customerName, orderNumber, totalPaise, cafeName, items } = args;

  // Order confirmation is the first business-initiated message to a customer, so it must
  // use an approved template — free-form text only delivers within an open 24h window.
  if (process.env.WHATSAPP_PROVIDER === "meta") {
    return sendMetaTemplate(normalizePhone(customerPhone), "order_confirmation", "en", [
      customerName,
      cafeName,
      orderNumber,
      formatRupees(totalPaise),
    ]);
  }

  const itemLines = items
    .map((i) => `• ${i.itemName} x${i.quantity}: ₹${formatRupees(i.subtotalPaise)}`)
    .join("\n");

  const message =
    `Hi ${customerName}, your order at ${cafeName} is confirmed! 🎉\n\n` +
    `Order ID: #${orderNumber}\n\n` +
    `Items:\n${itemLines}\n\n` +
    `Total: ₹${formatRupees(totalPaise)}\n\n` +
    `We'll notify you when it's ready for pickup.`;

  return sendWhatsApp({ to: customerPhone, message });
}

/** Send "order ready for pickup" WhatsApp message when status changes to READY */
export async function notifyOrderReady(args: {
  customerPhone: string;
  customerName: string;
  orderNumber: string;
  cafeName: string;
}): Promise<boolean> {
  const { customerPhone, customerName, orderNumber, cafeName } = args;

  // Order-ready is a business-initiated message sent outside any open 24h
  // window, so on Meta it must use an approved template — free-form text only
  // delivers while a customer-initiated session is open, which never happens here.
  if (process.env.WHATSAPP_PROVIDER === "meta") {
    return sendMetaTemplate(normalizePhone(customerPhone), "order_ready_alert", "en", [
      customerName,
      orderNumber,
      cafeName,
    ]);
  }

  const message =
    `Hi ${customerName}, your order #${orderNumber} at ${cafeName} is ready for pickup! 🛎️\n\n` +
    `Please collect it at the counter. Thanks for ordering with us!`;

  return sendWhatsApp({ to: customerPhone, message });
}
