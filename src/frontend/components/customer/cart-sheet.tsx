"use client";

import { useCartStore } from "@/frontend/stores/cart";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import { Minus, Plus, Trash2, X, ShoppingBag, ArrowRight } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartSheet({ isOpen, onClose, onCheckout }: CartSheetProps) {
  const { items, updateQuantity, removeItem, getTotalPaise, clearCart } = useCartStore();
  const total = getTotalPaise();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 z-40" onClick={onClose} />
      )}

      {/* Sheet */}
      {isOpen && (
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-[#111222] border-t-2 border-[#494454] shadow-2xl max-h-[85vh] flex flex-col"
        style={{ borderRadius: 0 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#494454]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 border-2 border-[#a078ff] flex items-center justify-center">
              <ShoppingBag size={16} className="text-[#a078ff]" />
            </div>
            <div>
              <h2
                className="text-lg font-extrabold leading-tight text-[#e2e0f8] uppercase"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                Your Cart
              </h2>
              <p
                className="text-xs text-[#cbc3d7]"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-[#ffb4ab] font-bold px-2 py-1 border border-[#ffb4ab]/40 hover:bg-[#ffb4ab]/10 transition-colors duration-75 uppercase"
                style={{ fontFamily: "var(--font-jb-mono), monospace", borderRadius: 0 }}
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 border-2 border-[#494454] flex items-center justify-center hover:border-[#e2e0f8] transition-colors duration-75 text-[#cbc3d7] hover:text-[#e2e0f8]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="h-[2px] bg-[#494454] mx-5" />

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#cbc3d7]">
              <div className="w-20 h-20 border-2 border-[#494454] flex items-center justify-center mb-4">
                <ShoppingBag size={32} className="text-[#494454]" />
              </div>
              <p
                className="font-bold text-[#e2e0f8] mb-1 uppercase"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                Cart is empty
              </p>
              <p
                className="text-sm text-[#cbc3d7]"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Add items from the menu to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex items-center gap-3 p-3 bg-[#1e1e2f] border-2 border-[#494454]"
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
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
                      <p
                        className="text-sm font-bold truncate text-[#e2e0f8] uppercase"
                        style={{ fontFamily: "var(--font-display), sans-serif" }}
                      >
                        {item.name}
                      </p>
                    </div>
                    <p
                      className="text-xs text-[#cbc3d7] pl-5"
                      style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                    >
                      {paiseToCurrencyShort(item.pricePaise)} each
                    </p>
                  </div>

                  {/* Quantity */}
                  <div
                    className="flex items-center bg-[#111222] border-2 border-[#494454] overflow-hidden"
                    style={{ borderRadius: 0 }}
                  >
                    <button
                      onClick={() =>
                        item.quantity === 1
                          ? removeItem(item.menuItemId)
                          : updateQuantity(item.menuItemId, item.quantity - 1)
                      }
                      className="w-11 h-11 flex items-center justify-center text-[#cbc3d7] hover:bg-[#494454]/30 hover:text-[#e2e0f8] transition-colors duration-75"
                    >
                      {item.quantity === 1 ? <Trash2 size={13} className="text-[#ffb4ab]" /> : <Minus size={13} />}
                    </button>
                    <span
                      className="w-8 h-11 flex items-center justify-center text-sm font-bold border-x-2 border-[#494454] text-[#e2e0f8]"
                      style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                      className="w-11 h-11 flex items-center justify-center text-[#cbc3d7] hover:bg-[#494454]/30 hover:text-[#e2e0f8] transition-colors duration-75"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <p
                    className="text-sm font-bold w-16 text-right text-[#cdf200]"
                    style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                  >
                    {paiseToCurrencyShort(item.pricePaise * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t-2 border-[#494454] px-5 py-4 bg-[#0c0d1d]">
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-[#cbc3d7] text-sm uppercase tracking-wider"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Total Amount
              </span>
              <span
                className="text-2xl font-extrabold text-[#cdf200]"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                {paiseToCurrencyShort(total)}
              </span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full bg-[#cdf200] text-black border-2 border-black py-3.5 font-bold text-sm uppercase tracking-wider neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 flex items-center justify-center gap-2 rounded-full"
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              Proceed to Checkout
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
      )}
    </>
  );
}
