"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Receipt, Printer, Loader2 } from "lucide-react";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import { formatReceiptText, receiptFileName } from "@/shared/utils/receipt";
import type { OrderSummary } from "@/shared/types";

interface OrderConfirmationProps {
  cafeSlug: string;
  order: OrderSummary;
}

const AUTO_REDIRECT_SECONDS = 20;

type PrintState = "idle" | "sharing" | "sent" | "downloaded" | "error";

// Web Share API's file-sharing support (canShare with a `files` array) isn't
// in TS's default DOM lib yet — narrow via feature detection at runtime.
type ShareNavigator = Navigator & {
  canShare?: (data: { files: File[] }) => boolean;
};

export function OrderConfirmation({ cafeSlug, order }: OrderConfirmationProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECONDS);
  const [printState, setPrintState] = useState<PrintState>("idle");

  useEffect(() => {
    // Pause the auto-redirect while a share/print attempt is in flight so it
    // can't yank the screen away mid-handoff.
    if (printState === "sharing") return;
    if (countdown <= 0) {
      router.push(`/${cafeSlug}`);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, printState, router, cafeSlug]);

  const handlePrint = async () => {
    setPrintState("sharing");
    const text = formatReceiptText(order);
    const file = new File([text], receiptFileName(order), { type: "text/plain" });
    const nav = navigator as ShareNavigator;

    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: `Receipt #${order.orderNumber}` });
        setPrintState("sent");
      } catch (err) {
        // AbortError just means the user backed out of the share sheet — not a failure.
        setPrintState(err instanceof Error && err.name === "AbortError" ? "idle" : "error");
      }
      return;
    }

    // No file-sharing support on this browser/device (e.g. testing on
    // desktop) — fall back to a plain download so the receipt is at least
    // obtainable rather than the button doing nothing.
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPrintState("downloaded");
    } catch {
      setPrintState("error");
    }
  };

  return (
    <div
      className="customer-app min-h-screen"
      style={{
        background: "#111222",
        backgroundImage:
          "radial-gradient(at 0% 0%, rgba(160,120,255,0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(205,242,0,0.04) 0px, transparent 50%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#a078ff]/20 via-[#6d3bd7]/20 to-[#0c0d1d]" />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative px-5 pt-12 pb-14 text-center text-[#e2e0f8] animate-fade-in-up">
          <div className="w-16 h-16 border-2 border-[#cdf200]/60 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={36} className="text-[#cdf200]" />
          </div>
          <h1
            className="text-2xl font-extrabold mb-2 uppercase"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Order #{order.orderNumber}
          </h1>
          <p className="text-sm text-[#cbc3d7]" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
            Your order has been placed successfully!
          </p>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#a078ff]/60 to-transparent" />
        <div className="h-5 bg-[#111222]" style={{ borderRadius: "20px 20px 0 0" }} />
      </div>

      {/* Order Details */}
      <div className="px-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="bg-[#1e1e2f] border-2 border-[#494454] overflow-hidden" style={{ borderRadius: 0 }}>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#28283a] border-b-2 border-[#494454]">
            <Receipt size={14} className="text-[#a078ff]" />
            <h2
              className="font-bold text-sm text-[#e2e0f8] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              Order Details
            </h2>
          </div>
          <div className="p-4 space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#cbc3d7]" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
                  <span className="font-bold text-[#e2e0f8]">{item.quantity}x</span> {item.itemName}
                </span>
                <span className="font-bold text-[#e2e0f8]" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
                  {item.isSubsidised ? "Subsidised" : paiseToCurrencyShort(item.subtotalPaise)}
                </span>
              </div>
            ))}
            {order.notes && (
              <p
                className="mt-2 pt-2 border-t-2 border-dashed border-[#494454] text-xs text-[#cbc3d7] italic"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Note: {order.notes}
              </p>
            )}
            <div className="pt-3 mt-2 border-t-2 border-[#494454] flex justify-between items-center">
              <span className="font-bold text-[#e2e0f8] uppercase" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
                {order.chargeablePaise === 0 ? "No payment collected" : "Total Paid"}
              </span>
              {order.chargeablePaise > 0 && (
                <span className="font-extrabold text-lg text-[#cdf200]" style={{ fontFamily: "var(--font-display), sans-serif" }}>
                  {paiseToCurrencyShort(order.chargeablePaise)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Receipt */}
      <div className="px-5 mt-4 animate-fade-in-up" style={{ animationDelay: "125ms" }}>
        <button
          onClick={handlePrint}
          disabled={printState === "sharing"}
          className="w-full flex items-center justify-center gap-2 bg-transparent text-[#e2e0f8] border-2 border-[#494454] hover:border-[#a078ff] disabled:opacity-60 px-6 py-3.5 font-bold text-sm uppercase tracking-wider transition-colors duration-100 rounded-full"
          style={{ fontFamily: "var(--font-jb-mono), monospace" }}
        >
          {printState === "sharing" ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Opening Printer...
            </>
          ) : (
            <>
              <Printer size={18} className="text-[#a078ff]" />
              Print Receipt
            </>
          )}
        </button>
        {printState === "sent" && (
          <p className="text-xs text-[#cdf200] text-center mt-2" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
            Sent to printer
          </p>
        )}
        {printState === "downloaded" && (
          <p className="text-xs text-[#cbc3d7] text-center mt-2" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
            Receipt downloaded
          </p>
        )}
        {printState === "error" && (
          <p className="text-xs text-[#ffb4ab] text-center mt-2" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
            Couldn&apos;t open the printer — please try again
          </p>
        )}
      </div>

      {/* Back to home */}
      <div className="px-5 mt-5 pb-10 text-center animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <p className="text-xs text-[#494454] mb-4" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
          Back to home in <span className="text-[#cdf200] font-semibold">{countdown}s</span>
        </p>
        <button
          onClick={() => router.push(`/${cafeSlug}`)}
          className="bg-[#cdf200] text-black border-2 border-black px-8 py-3 font-bold text-sm uppercase tracking-wider neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 rounded-full"
          style={{ fontFamily: "var(--font-jb-mono), monospace" }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
