"use client";

import { useState, useEffect, useCallback } from "react";
import { MenuTypeTabs, type MenuBundleEntry } from "@/frontend/components/dashboard/menu-type-tabs";
import { MenuTabPanel, type PanelMenuItem, type PanelMenuCategory } from "@/frontend/components/dashboard/menu-tab-panel";

interface MenuBundle extends MenuBundleEntry {
  items: PanelMenuItem[];
  categories: PanelMenuCategory[];
}

export default function MenuManagementPage() {
  const [menus, setMenus] = useState<MenuBundle[]>([]);
  const [autoScheduleMenus, setAutoScheduleMenus] = useState(true);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchBundle = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/menu/bundle");
      const data = await res.json();
      if (data.success) {
        const fetched: MenuBundle[] = data.data.menus;
        setMenus(fetched);
        setAutoScheduleMenus(data.data.autoScheduleMenus ?? true);
        setSelectedMenuId((prev) => prev && fetched.some((m) => m.id === prev) ? prev : fetched[0]?.id ?? null);
      }
    } catch (err) {
      console.error("Failed to fetch menu bundle:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBundle();
  }, [fetchBundle]);

  const handleSetActive = async (menuId: string) => {
    setBusy(true);
    try {
      await fetch("/api/dashboard/menu/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId }),
      });
      await fetchBundle();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSubsidised = async (menuId: string, isSubsidised: boolean) => {
    setBusy(true);
    try {
      await fetch(`/api/dashboard/menu/${menuId}/subsidised`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSubsidised }),
      });
      await fetchBundle();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAutoSchedule = async (enabled: boolean) => {
    setBusy(true);
    try {
      await fetch("/api/dashboard/menu/auto-schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      await fetchBundle();
    } finally {
      setBusy(false);
    }
  };

  const selectedMenu = menus.find((m) => m.id === selectedMenuId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Menu Management</h1>
        <p className="text-sm text-muted mt-0.5">
          Manage your Breakfast, Lunch, Evening Snacks, and Dinner menus. Only the active menu is shown to customers.
        </p>
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
              itemsApiBase="/api/dashboard/menu"
              categoriesApiBase="/api/dashboard/menu/categories"
              onRefetch={fetchBundle}
            />
          )}
        </>
      )}
    </div>
  );
}
