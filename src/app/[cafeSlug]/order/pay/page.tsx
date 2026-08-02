import { notFound } from "next/navigation";
import { paymentRepository } from "@/backend/repositories/payment.repository";
import CheckoutLauncher from "./checkout-launcher";

/**
 * Opens Razorpay Standard Checkout for an already-created order.
 *
 * Razorpay's hosted Payment Link page never autofills contact/email (their
 * stated security policy), which meant kiosk customers retyped details they
 * had just entered on the kiosk itself. Standard Checkout has to be opened
 * from a page the merchant controls, so this route exists purely to be that
 * page — the kiosk webview loads it exactly like it loaded the hosted link.
 */

// Both fields are mandatory on Checkout by default. Razorpay Support can
// enable hiding them per-account ("Making Phone Number Field Optional"), and
// this flag is what switches over once they have. Until then the fields are
// prefilled and locked, which costs the customer no typing either way.
const HIDE_CONTACT_FIELDS = process.env.RAZORPAY_HIDE_CONTACT_FIELDS === "true";

// Used only when an order carries no customer details of its own, which is
// the normal case for kiosk orders. Left blank the fields simply render
// empty and the customer fills them in — degraded, but never broken.
const FALLBACK_CONTACT = process.env.RAZORPAY_KIOSK_CONTACT || "";
const FALLBACK_EMAIL = process.env.RAZORPAY_KIOSK_EMAIL || "";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ cafeSlug: string }>;
  searchParams: Promise<{ txn?: string; orderId?: string }>;
}) {
  const { cafeSlug } = await params;
  const { txn } = await searchParams;

  if (!txn) notFound();

  const payment = await paymentRepository.findByMerchantTxnId(txn);
  if (!payment || !payment.razorpayOrderId) notFound();

  const cafe = payment.order.cafe;
  const keyId = cafe?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "";
  if (!keyId) notFound();

  // Only ever the publishable key id reaches the browser — the secret stays
  // server-side and is used solely to verify the signature that comes back.
  return (
    <CheckoutLauncher
      keyId={keyId}
      razorpayOrderId={payment.razorpayOrderId}
      merchantTxnId={txn}
      amountPaise={payment.amountPaise}
      cafeName={cafe?.name || "Order"}
      orderNumber={payment.order.orderNumber}
      returnUrl={`/${cafeSlug}/order/payment-return?txn=${txn}&orderId=${payment.orderId}`}
      prefillContact={payment.order.customerPhone || FALLBACK_CONTACT}
      prefillEmail={payment.order.customerEmail || FALLBACK_EMAIL}
      prefillName={payment.order.customerName || ""}
      hideContactFields={HIDE_CONTACT_FIELDS}
    />
  );
}
