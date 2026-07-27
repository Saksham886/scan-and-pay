"use client";

import { useState } from "react";
import { useCartStore } from "@/frontend/stores/cart";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import { Input } from "@/frontend/components/ui/input";
import { ShieldCheck, ArrowLeft, Receipt, User, ArrowRight } from "lucide-react";
import { v4 as uuid } from "uuid";
import { cn } from "@/shared/utils/cn";
import {
  normalizePhone,
  validateEmail,
  validateName,
  validatePhone,
} from "@/shared/utils/validation";

type FieldErrors = {
  name?: string;
  phone?: string;
  email?: string;
};

interface CheckoutFormProps {
  cafeSlug: string;
  cafeName: string;
  onBack: () => void;
}

export function CheckoutForm({ cafeSlug, cafeName, onBack }: CheckoutFormProps) {
  const { items } = useCartStore();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<{ name?: boolean; phone?: boolean; email?: boolean }>({});

  // Each cart item's pricePaise is already null when subsidised (whole-menu
  // or per-item) — mixed carts are possible, so the chargeable total only
  // sums the non-subsidised lines rather than trusting one page-level flag.
  const chargeableTotal = items.reduce((sum, i) => sum + (i.pricePaise !== null ? i.pricePaise * i.quantity : 0), 0);
  const isFullySubsidised = items.length > 0 && items.every((i) => i.pricePaise === null);

  const runValidators = (): FieldErrors => {
    const errors: FieldErrors = {};
    const nameCheck = validateName(customerName);
    if (!nameCheck.valid) errors.name = nameCheck.error;
    const phoneCheck = validatePhone(customerPhone);
    if (!phoneCheck.valid) errors.phone = phoneCheck.error;
    const emailCheck = validateEmail(customerEmail);
    if (!emailCheck.valid) errors.email = emailCheck.error;
    return errors;
  };

  const handleBlur = (field: "name" | "phone" | "email") => {
    setTouched((t) => ({ ...t, [field]: true }));
    const errors = runValidators();
    setFieldErrors((prev) => ({ ...prev, [field]: errors[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errors = runValidators();
    setFieldErrors(errors);
    setTouched({ name: true, phone: true, email: true });
    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields before continuing.");
      return;
    }

    setLoading(true);

    try {
      let idempotencyKey = sessionStorage.getItem("checkout_idempotency_key");
      if (!idempotencyKey) {
        idempotencyKey = uuid();
        sessionStorage.setItem("checkout_idempotency_key", idempotencyKey);
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeSlug,
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
          })),
          customerName: customerName.trim(),
          customerPhone: normalizePhone(customerPhone),
          customerEmail: customerEmail.trim().toLowerCase(),
          notes: notes || undefined,
          idempotencyKey,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to create order");
        if (response.status === 422 || response.status === 409) {
          sessionStorage.removeItem("checkout_idempotency_key");
        }
        return;
      }

      sessionStorage.setItem("pending_order_id", data.data.orderId);

      if (data.data.paymentRedirectUrl) {
        window.location.href = data.data.paymentRedirectUrl;
      } else {
        // Subsidised orders (and idempotent re-hits of an already-placed
        // order) have nothing to pay — go straight to the confirmation screen.
        sessionStorage.removeItem("pending_order_id");
        sessionStorage.removeItem("checkout_idempotency_key");
        useCartStore.getState().clearCart();
        window.location.href = `/${cafeSlug}/order/${data.data.orderId}/confirmation`;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#111222",
        backgroundImage:
          "radial-gradient(at 0% 0%, rgba(160,120,255,0.08) 0px, transparent 50%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <div
        className="bg-[#0c0d1d] border-b-2 border-[#494454] sticky top-0 z-10"
        style={{ boxShadow: "0 4px 0px 0px rgba(0,0,0,1)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={onBack}
            className="w-9 h-9 border-2 border-[#494454] flex items-center justify-center text-[#cbc3d7] hover:border-[#e2e0f8] hover:text-[#e2e0f8] transition-colors duration-75"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1
              className="text-lg font-extrabold leading-tight text-[#e2e0f8] uppercase"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Checkout
            </h1>
            <p
              className="text-xs text-[#cbc3d7]"
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              {cafeName}
            </p>
          </div>
          <ShieldCheck size={16} className="text-[#cdf200]" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-32">
        {/* Order Summary */}
        <div
          className="bg-[#1e1e2f] border-2 border-[#494454] overflow-hidden animate-fade-in-up"
          style={{ borderRadius: 0 }}
        >
          <div className="flex items-center gap-2 px-4 py-3 bg-[#28283a] border-b-2 border-[#494454]">
            <Receipt size={15} className="text-[#a078ff]" />
            <h2
              className="font-bold text-sm text-[#e2e0f8] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              Order Summary
            </h2>
          </div>
          <div className="p-4 space-y-2.5">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={cn(
                      "w-[14px] h-[14px] border-[1.5px] flex items-center justify-center flex-shrink-0",
                      item.isVeg ? "border-green-400" : "border-red-400"
                    )}
                  >
                    <span
                      className={cn(
                        "w-[7px] h-[7px] rounded-full",
                        item.isVeg ? "bg-green-400" : "bg-red-400"
                      )}
                    />
                  </span>
                  <span
                    className="text-[#cbc3d7] truncate"
                    style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="text-[#cbc3d7] flex-shrink-0"
                    style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                  >
                    x{item.quantity}
                  </span>
                </div>
                <span
                  className="font-bold ml-3 text-[#e2e0f8]"
                  style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                >
                  {item.pricePaise === null ? "Subsidised" : paiseToCurrencyShort(item.pricePaise * item.quantity)}
                </span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t-2 border-dashed border-[#494454] flex justify-between items-center">
              <span
                className="font-bold text-[#e2e0f8] uppercase"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                {isFullySubsidised ? "No payment required" : "Total"}
              </span>
              {!isFullySubsidised && (
                <span
                  className="font-extrabold text-xl text-[#cdf200]"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  {paiseToCurrencyShort(chargeableTotal)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div
          className="bg-[#1e1e2f] border-2 border-[#494454] overflow-hidden animate-fade-in-up"
          style={{ borderRadius: 0, animationDelay: "60ms" }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-[#28283a] border-b-2 border-[#494454]">
            <div className="flex items-center gap-2">
              <User size={15} className="text-[#a078ff]" />
              <h2
                className="font-bold text-sm text-[#e2e0f8] uppercase tracking-wider"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Your Details
              </h2>
            </div>
            <span
              className="text-[11px] text-[#cbc3d7]"
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              <span className="text-[#ffb4ab]">*</span> Required
            </span>
          </div>
          <div className="p-4 space-y-3">
            <Input
              id="name"
              label={<>Name <span className="text-[#ffb4ab]">*</span></>}
              placeholder="Your name for the order"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onBlur={() => handleBlur("name")}
              error={touched.name ? fieldErrors.name : undefined}
              autoComplete="name"
              required
            />
            <Input
              id="phone"
              label={<>Mobile Number <span className="text-[#ffb4ab]">*</span></>}
              placeholder="10-digit mobile number"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={() => handleBlur("phone")}
              error={touched.phone ? fieldErrors.phone : undefined}
              autoComplete="tel"
              required
            />
            <p className="-mt-3 text-xs text-muted">
              We&apos;ll send order updates to this number on WhatsApp, so make sure it&apos;s correct.
            </p>
            <Input
              id="email"
              label={<>Email <span className="text-[#ffb4ab]">*</span></>}
              placeholder="you@example.com"
              type="email"
              inputMode="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              onBlur={() => handleBlur("email")}
              error={touched.email ? fieldErrors.email : undefined}
              autoComplete="email"
              required
            />
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-bold text-[#e2e0f8] mb-1.5 uppercase tracking-wider"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Special Instructions
              </label>
              <textarea
                id="notes"
                className="w-full border-2 border-[#494454] bg-[#111222] px-4 py-2.5 text-[#e2e0f8] placeholder:text-[#494454] focus:outline-none focus:border-[#cdf200] resize-none text-sm transition-colors"
                style={{
                  borderRadius: 0,
                  fontFamily: "var(--font-jb-mono), monospace",
                }}
                rows={2}
                placeholder="Any special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <div
            className="bg-[#ffb4ab]/10 text-[#ffb4ab] text-sm p-3.5 border-2 border-[#ffb4ab]/40 flex items-start gap-2 animate-fade-in-up"
            style={{ fontFamily: "var(--font-jb-mono), monospace" }}
          >
            <span className="flex-shrink-0 mt-0.5 font-bold">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Secure Payment Note */}
        {!isFullySubsidised && (
          <div
            className="flex items-center gap-2 text-xs text-[#cbc3d7] justify-center pt-2 animate-fade-in-up"
            style={{ fontFamily: "var(--font-jb-mono), monospace", animationDelay: "120ms" }}
          >
            <ShieldCheck size={14} className="text-[#cdf200]" />
            <span>Secure payment</span>
          </div>
        )}
      </form>

      {/* Fixed Bottom Pay/Place Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0c0d1d] border-t-2 border-[#494454] p-4">
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="w-full bg-[#cdf200] disabled:bg-[#333345] disabled:text-[#cbc3d7] text-black border-2 border-black py-4 font-bold text-sm uppercase tracking-wider neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 flex items-center justify-center gap-2 rounded-full"
          style={{ fontFamily: "var(--font-jb-mono), monospace" }}
        >
          {loading ? (
            <>
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </>
          ) : isFullySubsidised ? (
            <>
              Place Order
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              Pay {paiseToCurrencyShort(chargeableTotal)}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
