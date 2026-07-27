"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/shared/types";

interface CartState {
  items: CartItem[];
  cafeSlug: string | null;
  menuId: string | null;

  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  setCafeSlug: (slug: string) => void;
  setMenuId: (menuId: string | null) => void;

  getTotalPaise: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cafeSlug: null,
      menuId: null,

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

      clearCart: () => set({ items: [], cafeSlug: null, menuId: null }),

      setCafeSlug: (slug) => {
        const { cafeSlug } = get();
        if (cafeSlug && cafeSlug !== slug) {
          set({ items: [], cafeSlug: slug });
        } else {
          set({ cafeSlug: slug });
        }
      },

      // Same clear-on-change semantics as setCafeSlug: if the admin switches
      // which menu is active while a customer has this tab open, a stale
      // cart from the previously-active menu must not ride into a new order.
      setMenuId: (menuId) => {
        const { menuId: current } = get();
        if (current && menuId && current !== menuId) {
          set({ items: [], menuId });
        } else {
          set({ menuId });
        }
      },

      getTotalPaise: () =>
        get().items.reduce((sum, i) => sum + (i.pricePaise ?? 0) * i.quantity, 0),

      getTotalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "cafe-cart",
      skipHydration: true,
    }
  )
);
