"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useCartStore } from "@/frontend/stores/cart";
import { useSSE } from "@/frontend/hooks/use-sse";
import { CategoryTabs } from "./category-tabs";
import { MenuItemCard } from "./menu-item-card";
import { FloatingCartButton } from "./floating-cart-button";
import { CartSheet } from "./cart-sheet";
import { CheckoutForm } from "./checkout-form";
import { Search, MapPin, Clock, X } from "lucide-react";
import { toTitleCase } from "@/shared/utils/format";
import type { CafePublic, MenuCategoryWithItems } from "@/shared/types";

interface MenuPageClientProps {
  cafe: CafePublic;
  categories: MenuCategoryWithItems[];
}

export function MenuPageClient({ cafe, categories: initialCategories }: MenuPageClientProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const { setCafeSlug } = useCartStore();

  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    setCafeSlug(cafe.slug);
  }, [cafe.slug, setCafeSlug]);

  const refetchMenu = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafe.slug}/menu`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch {
      // Silently fail
    }
  }, [cafe.slug]);

  useSSE({
    url: `/api/cafes/${cafe.slug}/menu/stream`,
    events: ["menu_updated"],
    onMessage: () => {
      refetchMenu();
    },
  });

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isSearching = searchQuery.trim().length > 0;

  const visibleCategories = useMemo(
    () => categories.filter((cat) => cat.items.length > 0),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    if (isSearching) return [];
    if (activeCategory === "all") return visibleCategories;
    return visibleCategories.filter((c) => c.id === activeCategory);
  }, [visibleCategories, isSearching, activeCategory]);

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const query = searchQuery.trim().toLowerCase();
    return visibleCategories.flatMap((cat) =>
      cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      )
    );
  }, [visibleCategories, searchQuery, isSearching]);

  if (showCheckout) {
    return (
      <div className="customer-app">
        <CheckoutForm
          cafeSlug={cafe.slug}
          cafeName={cafe.name}
          onBack={() => setShowCheckout(false)}
        />
      </div>
    );
  }

  return (
    <div
      className="customer-app min-h-screen pb-28"
      style={{
        background: "#111222",
        backgroundImage:
          "radial-gradient(at 0% 0%, rgba(160,120,255,0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(205,242,0,0.04) 0px, transparent 50%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden bg-[#0c0d1d]">
        {cafe.imageUrl ? (
          <>
            <Image
              src={cafe.imageUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-40 contrast-125 saturate-150"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c0d1d]/40 via-[#0c0d1d]/70 to-[#111222]" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at top right, rgba(160,120,255,0.18), transparent 55%), radial-gradient(ellipse at bottom left, rgba(109,59,215,0.22), transparent 60%)",
            }}
          />
        )}

        {/* Grain overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative px-5 pt-14 pb-8">
          <div className="inline-flex items-center gap-2 mb-5 animate-fade-in-up">
            <span className="h-1.5 w-1.5 rounded-full bg-[#cdf200]" />
            <span
              className="text-[10px] tracking-[0.22em] font-medium uppercase text-[#cdf200]/80"
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              Now serving
            </span>
          </div>

          <h1
            className="text-[2.4rem] leading-[1.0] tracking-[-0.03em] font-extrabold text-[#e2e0f8] mb-4 animate-fade-in-up uppercase"
            style={{ fontFamily: "var(--font-display), sans-serif", animationDelay: "50ms" }}
          >
            {cafe.name}
          </h1>

          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[#cbc3d7] animate-fade-in-up"
            style={{ fontFamily: "var(--font-jb-mono), monospace", animationDelay: "100ms" }}
          >
            {cafe.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} className="text-[#a078ff]" />
                <span>{cafe.address}</span>
              </span>
            )}
            {cafe.openingTime && cafe.closingTime && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} className="text-[#a078ff]" />
                <span>
                  {cafe.openingTime} – {cafe.closingTime}
                </span>
              </span>
            )}
          </div>

          {/* Search */}
          <div
            className="relative mt-6 animate-fade-in-up"
            style={{ animationDelay: "150ms" }}
          >
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbc3d7]" />
            <input
              type="text"
              placeholder="Search the menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1e2f] text-[#e2e0f8] placeholder:text-[#494454] pl-10 pr-10 py-3 text-sm border-2 border-[#494454] focus:outline-none focus:border-[#cdf200] transition-colors"
              style={{
                fontFamily: "var(--font-jb-mono), monospace",
                borderRadius: 0,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#cbc3d7] hover:text-[#e2e0f8]"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#a078ff]/60 to-transparent" />
      </div>

      {/* ── Category Tabs ── */}
      {!isSearching && (
        <CategoryTabs
          categories={[
            { id: "all", name: "All" },
            ...visibleCategories.map((c) => ({ id: c.id, name: toTitleCase(c.name) })),
          ]}
          activeCategory={activeCategory}
          onSelect={handleCategorySelect}
        />
      )}

      {/* ── Search results ── */}
      {isSearching ? (
        <div className="px-4 mt-5">
          {searchResults.length > 0 ? (
            <>
              <p
                className="text-xs text-[#cbc3d7] mb-4"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                {searchResults.length} {searchResults.length === 1 ? "result" : "results"} for{" "}
                <span className="text-[#e2e0f8] font-bold">&ldquo;{searchQuery}&rdquo;</span>
              </p>
              <div className="space-y-3 stagger-children">
                {searchResults.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 animate-fade-in-up">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-[#494454] flex items-center justify-center">
                <Search size={24} className="text-[#494454]" />
              </div>
              <p
                className="text-base font-bold text-[#e2e0f8] mb-1 uppercase"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                No dishes found
              </p>
              <p
                className="text-sm text-[#cbc3d7]"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Try a different search
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 mt-5 space-y-8">
          {filteredCategories.map((category, catIdx) => (
            <div
              key={category.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${catIdx * 60}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <h2
                  className="text-base font-extrabold text-[#e2e0f8] uppercase tracking-tight"
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                >
                  {toTitleCase(category.name)}
                </h2>
                <div className="flex-1 h-[2px] bg-[#494454]" />
                <span
                  className="text-xs text-[#cbc3d7] border border-[#494454] px-2 py-0.5"
                  style={{ fontFamily: "var(--font-jb-mono), monospace" }}
                >
                  {category.items.length}
                </span>
              </div>
              <div className="space-y-3 stagger-children">
                {category.items.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Cart Button */}
      <FloatingCartButton onClick={() => setShowCart(true)} />

      {/* Cart Sheet */}
      <CartSheet
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
      />
    </div>
  );
}
