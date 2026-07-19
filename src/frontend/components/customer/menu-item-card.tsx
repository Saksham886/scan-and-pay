"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Plus, Minus, Check } from "lucide-react";
import { useCartStore } from "@/frontend/stores/cart";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import { toTitleCase } from "@/shared/utils/format";
import type { MenuItemPublic } from "@/shared/types";
import { cn } from "@/shared/utils/cn";

interface MenuItemCardProps {
  item: MenuItemPublic;
}

export const MenuItemCard = memo(function MenuItemCard({ item }: MenuItemCardProps) {
  const quantity = useCartStore((s) => s.items.find((i) => i.menuItemId === item.id)?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const [bursts, setBursts] = useState<number[]>([]);
  const prevQty = useRef(quantity);
  const [popImage, setPopImage] = useState(false);

  useEffect(() => {
    if (quantity > prevQty.current) {
      const id = Date.now();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBursts((b) => [...b, id]);
      setPopImage(true);
      window.setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 800);
      window.setTimeout(() => setPopImage(false), 450);
    }
    prevQty.current = quantity;
  }, [quantity]);

  const handleAdd = useCallback(() => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      pricePaise: item.pricePaise,
      isVeg: item.isVeg,
      imageUrl: item.imageUrl,
    });
  }, [addItem, item.id, item.name, item.pricePaise, item.isVeg, item.imageUrl]);

  const inCart = quantity > 0;

  return (
    <div
      className={cn(
        "group relative flex gap-3 p-3 border-2 transition-all duration-150",
        "glass-card",
        inCart
          ? "border-[#cdf200] neo-shadow-sm"
          : "border-[#494454] hover:border-[#a078ff] neo-shadow"
      )}
      style={{ borderRadius: 0 }}
    >
      {/* Item Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            {/* Veg/Non-veg badge */}
            <span
              className={cn(
                "w-[18px] h-[18px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-transform",
                item.isVeg ? "border-green-400" : "border-red-400",
                inCart && "animate-wiggle"
              )}
            >
              <span
                className={cn(
                  "w-[9px] h-[9px] rounded-full",
                  item.isVeg ? "bg-green-400" : "bg-red-400"
                )}
              />
            </span>
            <h3
              className="font-bold text-[#e2e0f8] text-[15px] leading-tight truncate uppercase tracking-tight"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              {toTitleCase(item.name)}
            </h3>
            {inCart && (
              <span
                className="inline-flex items-center gap-0.5 bg-[#cdf200] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-scale-in"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                <Check size={10} strokeWidth={3} />
                {quantity}
              </span>
            )}
          </div>
          {item.description && (
            <p
              className="text-xs text-[#cbc3d7] leading-relaxed line-clamp-2 mt-0.5 mb-2 pr-1"
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              {item.description}
            </p>
          )}
        </div>
        <p
          className={cn(
            "font-bold text-base transition-colors",
            inCart ? "text-[#cdf200]" : "text-[#e2e0f8]"
          )}
          style={{ fontFamily: "var(--font-jb-mono), monospace" }}
        >
          {paiseToCurrencyShort(item.pricePaise)}
        </p>
      </div>

      {/* Image + Add Button */}
      <div className="relative flex flex-col items-center flex-shrink-0">
        <div
          className={cn(
            "w-[108px] h-24 overflow-hidden border-2 border-[#494454] transition-transform duration-200",
            popImage && "animate-pop"
          )}
          style={{ borderRadius: 0 }}
        >
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={108}
              height={96}
              className="w-full h-full object-cover contrast-110 saturate-110"
            />
          ) : (
            <div className={cn(
              "w-full h-full flex items-center justify-center",
              item.isVeg
                ? "bg-[#1e1e2f]"
                : "bg-[#1a1a2b]"
            )}>
              <span className="text-3xl">
                {item.isVeg ? "\u{1F96C}" : "\u{1F357}"}
              </span>
            </div>
          )}

          {/* Cart glow overlay */}
          {inCart && (
            <div className="absolute inset-0 border-2 border-[#cdf200]/40 pointer-events-none" />
          )}

          {/* Ripple + check burst */}
          <span className="pointer-events-none absolute inset-0 overflow-hidden">
            {bursts.map((id) => (
              <span
                key={`ring-${id}`}
                className="absolute inset-0 border-2 border-[#cdf200]/70 animate-add-ripple"
              />
            ))}
          </span>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {bursts.map((id) => (
              <span
                key={`check-${id}`}
                className="w-8 h-8 rounded-full bg-[#cdf200] text-black flex items-center justify-center shadow-lg animate-check-burst"
              >
                <Check size={16} strokeWidth={3.5} />
              </span>
            ))}
          </span>
        </div>

        {/* Quantity Controls - overlapping image bottom */}
        <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2">
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className={cn(
                "relative overflow-hidden px-5 py-1.5 text-sm font-bold",
                "bg-[#cdf200] text-black border-2 border-black",
                "neo-shadow-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                "transition-all duration-75 uppercase tracking-wide rounded-full",
                "hover:bg-[#b4d400]"
              )}
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              Add
            </button>
          ) : (
            <div
              className="flex items-center bg-[#cdf200] border-2 border-black neo-shadow-sm overflow-hidden animate-scale-in rounded-full"
            >
              <button
                onClick={() =>
                  quantity === 1 ? removeItem(item.id) : updateQuantity(item.id, quantity - 1)
                }
                className="px-3 py-1.5 text-black hover:bg-black/10 active:scale-90 transition-[background-color,transform] duration-75"
                aria-label="Decrease quantity"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span
                key={quantity}
                className="px-1 py-1.5 text-black font-bold text-sm min-w-[24px] text-center animate-pop"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                {quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, quantity + 1)}
                className="px-3 py-1.5 text-black hover:bg-black/10 active:scale-90 transition-[background-color,transform] duration-75"
                aria-label="Increase quantity"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
