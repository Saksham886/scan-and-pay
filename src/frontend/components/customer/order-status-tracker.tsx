"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { OrderSummary } from "@/shared/types";
import type { OrderStatus } from "@/generated/prisma";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import { CheckCircle2, Clock, ChefHat, Package, XCircle, Receipt } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface OrderStatusTrackerProps {
  orderId: string;
}

const statusSteps: { status: OrderStatus; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { status: "PAID",      label: "Order Confirmed",   sublabel: "Payment received",       icon: <CheckCircle2 size={18} /> },
  { status: "PREPARING", label: "Preparing",          sublabel: "Your food is being made", icon: <ChefHat size={18} /> },
  { status: "READY",     label: "Ready for Pickup",   sublabel: "Head to the counter",    icon: <Package size={18} /> },
  { status: "COMPLETED", label: "Picked Up",          sublabel: "Enjoy your meal!",       icon: <CheckCircle2 size={18} /> },
];

const statusOrder: OrderStatus[] = ["PAID", "PREPARING", "READY", "COMPLETED"];

export function OrderStatusTracker({ orderId }: OrderStatusTrackerProps) {
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const prevStatusRef = useRef<string | null>(null);
  const [readyAlert, setReadyAlert] = useState(false);

  const fireReadyNotification = useCallback(() => {
    setReadyAlert(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let interval: NodeJS.Timeout | undefined;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        const data = await res.json();

        if (data.success) {
          const newStatus = data.data.status;
          const prevStatus = prevStatusRef.current;
          if (newStatus === "READY" && prevStatus !== null && prevStatus !== "READY") {
            fireReadyNotification();
          }
          prevStatusRef.current = newStatus;
          setOrder(data.data);
          if (["COMPLETED", "CANCELLED", "FAILED"].includes(newStatus)) {
            clearInterval(interval);
          }
        } else {
          setError("Order not found");
        }
      } catch {
        setError("Failed to load order status");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [orderId, fireReadyNotification]);

  if (loading) {
    return (
      <div
        className="customer-app min-h-screen flex items-center justify-center"
        style={{ background: "#111222" }}
      >
        <div className="text-center animate-fade-in-up">
          <div
            className="w-14 h-14 border-4 border-[#494454] border-t-[#a078ff] rounded-full animate-spin mx-auto mb-4"
          />
          <p
            className="text-[#cbc3d7] font-medium"
            style={{ fontFamily: "var(--font-jb-mono), monospace" }}
          >
            Loading order status...
          </p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div
        className="customer-app min-h-screen flex items-center justify-center p-4"
        style={{ background: "#111222" }}
      >
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 border-2 border-[#ffb4ab]/40 flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} className="text-[#ffb4ab]" />
          </div>
          <h2
            className="text-lg font-extrabold text-[#e2e0f8] mb-2 uppercase"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Something went wrong
          </h2>
          <p
            className="text-[#cbc3d7] mb-5"
            style={{ fontFamily: "var(--font-jb-mono), monospace" }}
          >
            {error || "Could not load order"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="border-2 border-[#a078ff] text-[#a078ff] px-6 py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-[#a078ff]/10 transition-colors"
            style={{ fontFamily: "var(--font-jb-mono), monospace" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isFailed = order.status === "FAILED" || order.status === "CANCELLED";
  const currentStepIndex = statusOrder.indexOf(order.status as OrderStatus);
  const isPaymentPending = order.status === "PAYMENT_PENDING" || order.status === "CREATED";

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
      {/* ── Header ── */}
      <div className="relative overflow-hidden">
        <div
          className={cn(
            "absolute inset-0",
            isFailed
              ? "bg-gradient-to-br from-[#ffb4ab]/20 to-[#93000a]/30"
              : isPaymentPending
                ? "bg-gradient-to-br from-[#a078ff]/20 to-[#6d3bd7]/30"
                : "bg-gradient-to-br from-[#a078ff]/20 via-[#6d3bd7]/20 to-[#0c0d1d]"
          )}
        />
        {/* Grain */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative px-5 pt-12 pb-14 text-center text-[#e2e0f8]">
          {isFailed ? (
            <div className="animate-fade-in-up">
              <div className="w-16 h-16 border-2 border-[#ffb4ab]/40 flex items-center justify-center mx-auto mb-3">
                <XCircle size={36} className="text-[#ffb4ab]" />
              </div>
              <h1
                className="text-xl font-extrabold mb-1 uppercase"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                {order.status === "CANCELLED" ? "Order Cancelled" : "Payment Failed"}
              </h1>
              <p
                className="text-sm text-[#cbc3d7]"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Please try placing a new order
              </p>
            </div>
          ) : isPaymentPending ? (
            <div className="animate-fade-in-up">
              <div className="w-16 h-16 border-2 border-[#a078ff]/60 flex items-center justify-center mx-auto mb-3">
                <Clock size={36} className="text-[#a078ff] animate-pulse" />
              </div>
              <h1
                className="text-xl font-extrabold mb-1 uppercase"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                Confirming Payment...
              </h1>
              <p
                className="text-sm text-[#cbc3d7]"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Please wait while we verify your payment
              </p>
            </div>
          ) : (
            <div className="animate-fade-in-up">
              <div className="w-16 h-16 border-2 border-[#cdf200]/60 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={36} className="text-[#cdf200]" />
              </div>
              <h1
                className="text-2xl font-extrabold mb-2 uppercase"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                Order #{order.orderNumber}
              </h1>
              <div
                className="inline-flex items-center gap-1.5 bg-[#1e1e2f] border-2 border-[#494454] px-3 py-1 text-sm font-medium"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                {statusSteps[currentStepIndex]?.icon}
                <span>{statusSteps[currentStepIndex]?.label || order.status}</span>
              </div>
            </div>
          )}
        </div>

        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#a078ff]/60 to-transparent" />
        <div className="h-5 bg-[#111222]" style={{ borderRadius: "20px 20px 0 0" }} />
      </div>

      {/* Ready Alert Banner */}
      {readyAlert && order.status === "READY" && (
        <div className="px-5 -mt-3 mb-3 animate-fade-in-up">
          <div
            className="bg-[#cdf200]/10 border-2 border-[#cdf200]/40 p-4 flex items-center gap-3"
            style={{ borderRadius: 0 }}
          >
            <div className="w-10 h-10 border-2 border-[#cdf200] flex items-center justify-center flex-shrink-0">
              <Package size={20} className="text-[#cdf200]" />
            </div>
            <div>
              <p
                className="font-bold text-[#cdf200] text-sm uppercase"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                Your order is ready!
              </p>
              <p
                className="text-xs text-[#cbc3d7]"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Please head to the counter to pick it up
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Timeline */}
      {!isFailed && !isPaymentPending && currentStepIndex >= 0 && (
        <div className="px-5 -mt-2 mb-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div
            className="bg-[#1e1e2f] border-2 border-[#494454] p-5"
            style={{ boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", borderRadius: 0 }}
          >
            <div className="space-y-0">
              {statusSteps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isLast = index === statusSteps.length - 1;

                return (
                  <div key={step.status}>
                    <div className="flex items-center gap-4">
                      {/* Icon circle */}
                      <div
                        className={cn(
                          "w-10 h-10 border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-200",
                          isCurrent
                            ? "border-[#cdf200] text-[#cdf200] shadow-[0_0_20px_rgba(205,242,0,0.4)]"
                            : isActive
                              ? "border-[#a078ff] text-[#a078ff]"
                              : "border-[#494454] text-[#494454]"
                        )}
                      >
                        {step.icon}
                      </div>
                      {/* Text */}
                      <div className="flex-1">
                        <p
                          className={cn(
                            "text-sm font-bold uppercase",
                            isActive ? "text-[#e2e0f8]" : "text-[#494454]"
                          )}
                          style={{ fontFamily: "var(--font-display), sans-serif" }}
                        >
                          {step.label}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            isActive ? "text-[#cbc3d7]" : "text-[#494454]"
                          )}
                          style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                        >
                          {step.sublabel}
                        </p>
                      </div>
                      {/* Status indicator */}
                      {isCurrent && (
                        <span
                          className="text-[11px] text-black font-bold bg-[#cdf200] px-2.5 py-1 animate-progress-pulse uppercase"
                          style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                        >
                          NOW
                        </span>
                      )}
                      {isActive && !isCurrent && (
                        <CheckCircle2 size={16} className="text-[#a078ff]" />
                      )}
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div className="ml-5 pl-[1px] py-1">
                        <div
                          className={cn(
                            "w-[2px] h-6 ml-[3px]",
                            isActive ? "bg-[#a078ff]/60" : "bg-[#494454]"
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="px-5 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <div
          className="bg-[#1e1e2f] border-2 border-[#494454] overflow-hidden"
          style={{ borderRadius: 0 }}
        >
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
                <span
                  className="text-[#cbc3d7]"
                  style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                >
                  <span className="font-bold text-[#e2e0f8]">{item.quantity}x</span>{" "}
                  {item.itemName}
                </span>
                <span
                  className="font-bold text-[#e2e0f8]"
                  style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                >
                  {paiseToCurrencyShort(item.subtotalPaise)}
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
              <span
                className="font-bold text-[#e2e0f8] uppercase"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Total Paid
              </span>
              <span
                className="font-extrabold text-lg text-[#cdf200]"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                {paiseToCurrencyShort(order.totalPaise)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="px-5 mt-5 pb-8 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <div
          className="text-center text-xs text-[#cbc3d7] space-y-1"
          style={{ fontFamily: "var(--font-jb-mono), monospace" }}
        >
          <p className="flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a078ff] animate-pulse" />
            This page auto-refreshes every 5 seconds
          </p>
          {order.customerName && (
            <p>
              Order for: <strong className="text-[#e2e0f8]">{order.customerName}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
