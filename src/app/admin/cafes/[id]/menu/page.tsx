"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { MenuTypeTabs, type MenuBundleEntry } from "@/frontend/components/dashboard/menu-type-tabs";
import { MenuTabPanel, type PanelMenuItem, type PanelMenuCategory } from "@/frontend/components/dashboard/menu-tab-panel";

interface MenuBundle extends MenuBundleEntry {
  items: PanelMenuItem[];
  categories: PanelMenuCategory[];
}

interface CafeInfo {
  id: string;
  name: string;
  slug: string;
}

export default function AdminCafeMenuPage() {
  const { id: cafeId } = useParams<{ id: string }>();
  const router = useRouter();

  const [cafe, setCafe] = useState<CafeInfo | null>(null);
  const [menus, setMenus] = useState<MenuBundle[]>([]);
  const [autoScheduleMenus, setAutoScheduleMenus] = useState(true);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const itemsApiBase = `/api/admin/cafes/${cafeId}/menu`;
  const categoriesApiBase = `/api/admin/cafes/${cafeId}/categories`;

  const fetchData = useCallback(async () => {
    try {
      const [bundleRes, cafeRes] = await Promise.all([
        fetch(`${itemsApiBase}/bundle`),
        fetch(`/api/admin/cafes/${cafeId}`),
      ]);
      const bundleData = await bundleRes.json();
      const cafeData = await cafeRes.json();

      if (bundleData.success) {
        const fetched: MenuBundle[] = bundleData.data.menus;
        setMenus(fetched);
        setAutoScheduleMenus(bundleData.data.autoScheduleMenus ?? true);
        setSelectedMenuId((prev) => prev && fetched.some((m) => m.id === prev) ? prev : fetched[0]?.id ?? null);
      }
      if (cafeData.success) {
        setCafe(cafeData.data);
      }
    } catch (err) {
      console.error("Failed to fetch menu:", err);
    } finally {
      setLoading(false);
    }
  }, [itemsApiBase, cafeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetActive = async (menuId: string) => {
    setBusy(true);
    try {
      await fetch(`${itemsApiBase}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId }),
      });
      await fetchData();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSubsidised = async (menuId: string, isSubsidised: boolean) => {
    setBusy(true);
    try {
      await fetch(`${itemsApiBase}/${menuId}/subsidised`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSubsidised }),
      });
      await fetchData();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAutoSchedule = async (enabled: boolean) => {
    setBusy(true);
    try {
      await fetch(`${itemsApiBase}/auto-schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      await fetchData();
    } finally {
      setBusy(false);
    }
  };

  const selectedMenu = menus.find((m) => m.id === selectedMenuId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => router.push(`/admin/cafes/${cafeId}`)}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to {cafe?.name || "Cafe"}
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Menu {cafe ? `- ${cafe.name}` : ""}</h1>
            {cafe && (
              <a href={`/${cafe.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink size={12} />
                Customer view
              </a>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-4 animate-pulse h-32" />
          ))}
        </div>
      ) : (
        <>
          <MenuTypeTabs
            menus={menus}
            selectedMenuId={selectedMenuId}
            onSelect={setSelectedMenuId}
            onSetActive={handleSetActive}
            onToggleSubsidised={handleToggleSubsidised}
            autoScheduleEnabled={autoScheduleMenus}
            onToggleAutoSchedule={handleToggleAutoSchedule}
            busy={busy}
          />
          {selectedMenu && (
            <MenuTabPanel
              menuId={selectedMenu.id}
              items={selectedMenu.items}
              categories={selectedMenu.categories}
              itemsApiBase={itemsApiBase}
              categoriesApiBase={categoriesApiBase}
              onRefetch={fetchData}
            />
          )}
        </>
      )}
    </div>
  );
}
