"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, XCircle, RefreshCw, ArrowLeft } from "lucide-react";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

/**
 * Razorpay accepts a bare 10-digit number but prefills far more reliably
 * with the country code attached, and an unprefilled field is exactly the
 * retyping this whole flow exists to remove.
 */
function withCountryCode(contact: string): string {
  if (!contact) return "";
  if (contact.startsWith("+")) return contact;
  return /^\d{10}$/.test(contact) ? `+91${contact}` : contact;
}

export default function CheckoutLauncher({
  keyId,
  razorpayOrderId,
  merchantTxnId,
  amountPaise,
  cafeName,
  orderNumber,
  returnUrl,
  prefillContact,
  prefillEmail,
  prefillName,
  hideContactFields,
}: {
  keyId: string;
  razorpayOrderId: string;
  merchantTxnId: string;
  amountPaise: number;
  cafeName: string;
  orderNumber: string;
  returnUrl: string;
  prefillContact: string;
  prefillEmail: string;
  prefillName: string;
  hideContactFields: boolean;
}) {
  const [phase, setPhase] = useState<"opening" | "dismissed" | "error">("opening");
  const [error, setError] = useState("");
  // Checkout is opened from an effect, and React 18 double-invokes effects in
  // dev. Without this the customer gets two stacked payment modals.
  const opened = useRef(false);

  const openCheckout = useCallback(async () => {
    try {
      await loadCheckoutScript();
    } catch {
      setPhase("error");
      setError("Could not reach Razorpay. Check the internet connection and try again.");
      return;
    }

    if (!window.Razorpay) {
      setPhase("error");
      setError("Could not reach Razorpay. Check the internet connection and try again.");
      return;
    }

    const contact = withCountryCode(prefillContact);

    const rzp = new window.Razorpay({
      key: keyId,
      order_id: razorpayOrderId,
      amount: amountPaise,
      currency: "INR",
      name: cafeName,
      description: `Order #${orderNumber}`,
      prefill: {
        ...(prefillName && { name: prefillName }),
        ...(contact && { contact }),
        ...(prefillEmail && { email: prefillEmail }),
      },
      // Locked rather than merely prefilled so a kiosk customer can't leave a
      // number that disagrees with the one stored against the order.
      readonly: hideContactFields
        ? {}
        : {
            ...(contact && { contact: true }),
            ...(prefillEmail && { email: true }),
          },
      hidden: hideContactFields ? { contact: true, email: true } : {},
      // UPI QR first: on a kiosk the customer pays from their own phone, so
      // landing straight on a scannable code removes a whole method-picking
      // step. Other methods stay reachable underneath for cafes that need
      // them.
      config: {
        display: {
          blocks: {
            upiqr: {
              name: "Scan & Pay with any UPI app",
              instruments: [{ method: "upi", flows: ["qr"] }],
            },
          },
          sequence: ["block.upiqr"],
          preferences: { show_default_blocks: true },
        },
      },
      // A kiosk is a shared device — never offer the previous customer's
      // saved cards or UPI IDs to the next one.
      remember_customer: false,
      retry: { enabled: false },
      modal: {
        escape: false,
        backdropclose: false,
        ondismiss: () => setPhase("dismissed"),
      },
      handler: async (response: Record<string, string>) => {
        try {
          await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              merchantTransactionId: merchantTxnId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
        } catch {
          // Verification is the fast path, not the only one — the webhook and
          // the reconcile call on the return page both still settle this
          // payment, so a failed request here must not strand the customer.
        }
        window.location.href = returnUrl;
      },
    });

    rzp.open();
  }, [
    keyId,
    razorpayOrderId,
    merchantTxnId,
    amountPaise,
    cafeName,
    orderNumber,
    returnUrl,
    prefillContact,
    prefillEmail,
    prefillName,
    hideContactFields,
  ]);

  const retryCheckout = useCallback(() => {
    setPhase("opening");
    setError("");
    openCheckout();
  }, [openCheckout]);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    // Opening Checkout is exactly the "synchronise with an external system"
    // case the rule carves out — the only setState calls inside are on the
    // script-load failure path, which can't run before the first await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openCheckout();
  }, [openCheckout]);

  if (phase === "opening") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto mb-4 text-primary animate-spin" />
          <h1 className="text-xl font-bold mb-2">Opening Payment...</h1>
          <p className="text-muted text-sm">Do not close this page or press back</p>
        </div>
      </div>
    );
  }

  // Both the dismissed and error states stay on this page rather than
  // continuing to the return URL: the order is still PAYMENT_PENDING, so
  // handing it to the return page would just spend 30s polling before
  // reporting a failure the customer already knows about.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-xs w-full">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <XCircle size={36} className="text-red-600" />
        </div>
        <h1 className="text-xl font-bold mb-2">
          {phase === "error" ? "Payment Unavailable" : "Payment Cancelled"}
        </h1>
        <p className="text-muted text-sm mb-6">
          {error || "You closed the payment window before it finished. Nothing has been charged."}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={retryCheckout}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-semibold text-sm active:scale-[0.97] transition-transform"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          <a
            href={returnUrl}
            className="inline-flex items-center justify-center gap-2 text-muted hover:text-foreground text-sm py-2 transition-colors"
          >
            <ArrowLeft size={14} />
            Cancel Order
          </a>
        </div>
      </div>
    </div>
  );
}
