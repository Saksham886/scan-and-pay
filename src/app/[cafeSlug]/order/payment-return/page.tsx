"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { useCartStore } from "@/frontend/stores/cart";

export default function PaymentReturnPage({
  params: paramsPromise,
}: {
  params: Promise<{ cafeSlug: string }>;
}) {
  const [cafeSlug, setCafeSlug] = useState<string>("");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [countdown, setCountdown] = useState(5);
  const reconciled = useRef(false);

  useEffect(() => {
    paramsPromise.then((p) => setCafeSlug(p.cafeSlug));
  }, [paramsPromise]);

  useEffect(() => {
    if (!cafeSlug) return;
    if (reconciled.current) return;
    reconciled.current = true;

    // Get transaction info from URL params (set by PhonePe redirect)
    const txnId = searchParams.get("txn");
    const orderId = searchParams.get("orderId") || sessionStorage.getItem("pending_order_id");

    if (!orderId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("failed");
      return;
    }

    const reconcileAndCheck = async () => {
      try {
        // Step 1: Trigger server-side reconciliation with PhonePe
        if (txnId) {
          await fetch(`/api/orders/${orderId}/reconcile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ merchantTransactionId: txnId }),
          });
        }

        // Step 2: Poll the order status until it reaches a terminal state
        await pollOrderStatus(orderId);
      } catch {
        setStatus("failed");
      }
    };

    const pollOrderStatus = async (oid: string, attempts = 0): Promise<void> => {
      if (attempts > 15) {
        // 15 attempts * 2s = 30s max
        setStatus("failed");
        return;
      }

      try {
        const res = await fetch(`/api/orders/${oid}/status`);

        // Treat rate limits and server errors as transient - keep polling
        if (res.status === 429 || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 3000));
          return pollOrderStatus(oid, attempts + 1);
        }

        const data = await res.json();

        if (!data.success) {
          setStatus("failed");
          return;
        }

        const orderStatus = data.data.status;

        if (["PAID", "PREPARING", "READY", "COMPLETED"].includes(orderStatus)) {
          setStatus("success");
          sessionStorage.removeItem("pending_order_id");
          sessionStorage.removeItem("checkout_idempotency_key");
          // Clear cart using the store action (key is "cafe-cart" not "cart-storage")
          try { useCartStore.getState().clearCart(); } catch {}
          // Redirect to order status tracker
          setTimeout(() => {
            window.location.href = `/${cafeSlug}/order/${oid}/status`;
          }, 1500);
          return;
        }

        if (["FAILED", "CANCELLED"].includes(orderStatus)) {
          setStatus("failed");
          sessionStorage.removeItem("pending_order_id");
          return;
        }

        // Still pending - wait and poll again
        await new Promise((r) => setTimeout(r, 2000));
        return pollOrderStatus(oid, attempts + 1);
      } catch {
        setStatus("failed");
      }
    };

    reconcileAndCheck();
  }, [cafeSlug, searchParams]);

  // Auto-redirect countdown when payment fails
  useEffect(() => {
    if (status !== "failed" || !cafeSlug) return;
    if (countdown <= 0) {
      window.location.href = `/${cafeSlug}`;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, cafeSlug]);

  if (status === "failed") {
    return (
      <div className="min-h-screen bg-[#1a120d] flex items-center justify-center p-6">
        {/* subtle warm gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at top, rgba(220,38,38,0.12), transparent 55%), radial-gradient(ellipse at bottom, rgba(180,83,9,0.15), transparent 60%)",
          }}
        />

        <div className="relative text-center animate-fade-in-up max-w-xs w-full">
          {/* Icon with pulsing ring */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            <span className="absolute inset-2 rounded-full bg-red-500/10" />
            <div className="relative w-24 h-24 rounded-full bg-red-950/60 border border-red-800/50 flex items-center justify-center">
              <XCircle size={42} className="text-red-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-stone-50 mb-2">Payment Failed</h1>
          <p className="text-stone-400 text-sm leading-relaxed mb-3">
            Something went wrong with your payment. No worries, if any amount was deducted it will be refunded within 5-7 business days.
          </p>

          {/* Countdown bar */}
          <p className="text-stone-500 text-xs mb-4">
            Taking you back to the menu in{" "}
            <span className="text-amber-400 font-semibold">{countdown}s</span>
          </p>
          <div className="w-full h-1 bg-stone-800 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-orange-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {cafeSlug && (
              <a
                href={`/${cafeSlug}`}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-700 text-white px-5 py-3 rounded-2xl font-semibold text-sm shadow-lg shadow-amber-900/40 active:scale-[0.97] transition-transform"
              >
                <ArrowLeft size={16} />
                Back to Menu Now
              </a>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 text-stone-400 hover:text-stone-200 text-sm py-2 transition-colors"
            >
              <RefreshCw size={14} />
              Retry Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center animate-fade-in-up max-w-sm">
        {status === "loading" && (
          <>
            <Loader2 size={48} className="mx-auto mb-4 text-primary animate-spin" />
            <h1 className="text-xl font-bold mb-2">Verifying Payment...</h1>
            <p className="text-muted text-sm">Please wait while we confirm your payment with PhonePe</p>
            <p className="text-muted text-xs mt-3">Do not close this page or press back</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={36} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted text-sm">Redirecting to your order status...</p>
          </>
        )}
      </div>
    </div>
  );
}
