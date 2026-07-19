"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/shared/types";

interface CartState {
  items: CartItem[];
  cafeSlug: string | null;

  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  setCafeSlug: (slug: string) => void;

  getTotalPaise: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cafeSlug: null,

      addItem: (item) => {
        const { items } = get();
        const existing = items.find((i) => i.menuItemId === item.menuItemId);

        if (existing) {
          set({
            items: items.map((i) =>
              i.menuItemId === item.menuItemId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity: 1 }] });
        }
      },

      removeItem: (menuItemId) => {
        set({ items: get().items.filter((i) => i.menuItemId !== menuItemId) });
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.menuItemId === menuItemId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [], cafeSlug: null }),

      setCafeSlug: (slug) => {
        const { cafeSlug } = get();
        if (cafeSlug && cafeSlug !== slug) {
          set({ items: [], cafeSlug: slug });
        } else {
          set({ cafeSlug: slug });
        }
      },

      getTotalPaise: () =>
        get().items.reduce((sum, i) => sum + i.pricePaise * i.quantity, 0),

      getTotalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "cafe-cart",
      skipHydration: true,
    }
  )
);
