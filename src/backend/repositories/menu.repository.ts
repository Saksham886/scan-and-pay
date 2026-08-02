import { prisma } from "@/backend/lib/db";
import { toTitleCase } from "@/shared/utils/format";
import type { MenuType } from "@/generated/prisma";
import { resolveScheduledMenuType } from "@/backend/lib/menu-schedule";

export const menuRepository = {
  async getCafeBySlug(slug: string) {
    return prisma.cafe.findUnique({
      where: { slug, isActive: true },
    });
  },

  async getAllMenuItems(cafeId: string) {
    return prisma.menuItem.findMany({
      where: { deletedAt: null, OR: [{ cafeId }, { cafeId: null }] },
      include: { category: true },
      orderBy: { sortOrder: "asc" },
    });
  },

  // Returns all items across all cafes for admin unified view.
  // Pass cafeId="null" to fetch only global items.
  async getAllMenuItemsAdmin(cafeId?: string) {
    const where =
      cafeId === "null" ? { cafeId: null as null }
      : cafeId ? { cafeId }
      : {};
    return prisma.menuItem.findMany({
      where: { ...where, deletedAt: null },
      include: { category: true, cafe: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  // Returns all global items (cafeId = null)
  async getGlobalMenuItems() {
    return prisma.menuItem.findMany({
      where: { cafeId: null, deletedAt: null },
      include: { category: true },
      orderBy: { sortOrder: "asc" },
    });
  },

  async createMenuItem(data: {
    cafeId?: string | null;
    menuId?: string | null;
    categoryId?: string;
    name: string;
    description?: string;
    pricePaise: number;
    imageUrl?: string;
    isVeg?: boolean;
    menuType?: MenuType | null;
    isSubsidised?: boolean;
  }) {
    return prisma.menuItem.create({
      data: { ...data, name: toTitleCase(data.name) },
    });
  },

  async updateMenuItem(
    id: string,
    data: {
      cafeId?: string | null;
      menuId?: string | null;
      name?: string;
      description?: string;
      pricePaise?: number;
      imageUrl?: string;
      isAvailable?: boolean;
      isVeg?: boolean;
      categoryId?: string;
      sortOrder?: number;
      menuType?: MenuType | null;
      isSubsidised?: boolean;
    }
  ) {
    const normalized = data.name !== undefined
      ? { ...data, name: toTitleCase(data.name) }
      : data;
    return prisma.menuItem.update({ where: { id }, data: normalized });
  },

  /** Soft delete — see MenuItem.deletedAt. isAvailable is cleared too so any
   *  query that predates this filter still stops serving the item. */
  async deleteMenuItem(id: string) {
    return prisma.menuItem.update({
      where: { id },
      data: { deletedAt: new Date(), isAvailable: false },
    });
  },

  // Returns categories visible to a specific cafe (cafe-specific + global),
  // OR global-only when cafeId is "null", OR all when cafeId is undefined.
  async getCategories(cafeId?: string) {
    if (cafeId === undefined) {
      return prisma.menuCategory.findMany({
        where: { isActive: true },
        include: { cafe: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      });
    }
    if (cafeId === "null") {
      return prisma.menuCategory.findMany({
        where: { cafeId: null, isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    }
    const cafeCategories = await prisma.menuCategory.findMany({
      where: { cafeId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    const globalCategories = await prisma.menuCategory.findMany({
      where: { cafeId: null, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return [...cafeCategories, ...globalCategories];
  },

  async createCategory(data: { cafeId?: string | null; menuId?: string | null; name: string; sortOrder?: number }) {
    return prisma.menuCategory.create({
      data: { ...data, name: toTitleCase(data.name) },
    });
  },

  async updateCategory(id: string, data: { name?: string; sortOrder?: number; isActive?: boolean }) {
    const normalized = data.name !== undefined
      ? { ...data, name: toTitleCase(data.name) }
      : data;
    return prisma.menuCategory.update({ where: { id }, data: normalized });
  },

  async deleteCategory(id: string) {
    // Unlink items from this category first, then delete
    await prisma.menuItem.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    return prisma.menuCategory.delete({ where: { id } });
  },

  async getCategoryById(id: string) {
    return prisma.menuCategory.findUnique({ where: { id } });
  },

  // ─── Menu-scoped (Corporate Catering Kiosk Pivot) ──────

  /** All 4 menus for a cafe, each with its categories/items (including
   *  meal-period-matching global items the cafe hasn't overridden), for the
   *  admin 4-tab UI — so owners can see and, if needed, override what's
   *  actually being shown to their customers. When auto-schedule is on, the
   *  returned isActive flags reflect the meal-period clock rather than the
   *  stored (and in that mode, inert) manual flag, so the dashboard's
   *  "Active" badge always matches what customers are actually seeing. */
  async getMenuBundle(cafeId: string) {
    const cafe = await prisma.cafe.findUnique({ where: { id: cafeId }, select: { autoScheduleMenus: true } });
    const autoScheduleMenus = cafe?.autoScheduleMenus ?? false;
    const scheduledType = autoScheduleMenus ? resolveScheduledMenuType() : null;

    const menus = await prisma.menu.findMany({
      where: { cafeId },
      include: {
        categories: { orderBy: { sortOrder: "asc" } },
        items: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { type: "asc" },
    });

    const globalCategories = await prisma.menuCategory.findMany({
      where: { cafeId: null, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const bundled = await Promise.all(
      menus.map(async (menu) => {
        // Scoped to this menu's own overrides, matching getMenuForMenuId's
        // exclusion scope — so the dashboard shows exactly what customers see.
        // Queried rather than read off menu.items for the same reason as there:
        // hidden and deleted overrides are filtered out of that list, and
        // deriving the exclusions from it would let the shared original
        // reappear right after the owner removed it.
        const overrides = await prisma.menuItem.findMany({
          where: { menuId: menu.id, overriddenFromId: { not: null } },
          select: { overriddenFromId: true },
        });
        const overriddenIds = overrides
          .map((i) => i.overriddenFromId)
          .filter((id): id is string => id !== null);
        const globalItems = await prisma.menuItem.findMany({
          where: {
            cafeId: null,
            isAvailable: true,
            deletedAt: null,
            OR: [{ menuType: null }, { menuType: menu.type }],
            NOT: { id: { in: overriddenIds } },
          },
          orderBy: { sortOrder: "asc" },
        });
        return {
          ...menu,
          isActive: scheduledType ? menu.type === scheduledType : menu.isActive,
          items: [...menu.items, ...globalItems],
          categories: [...menu.categories, ...globalCategories],
        };
      })
    );

    return { autoScheduleMenus, menus: bundled };
  },

  /** The menu currently shown to customers. When the cafe has auto-schedule
   *  on (default), this follows the meal-period clock — the stored isActive
   *  flags are inert placeholders in that mode, only taking effect again
   *  once auto-schedule is turned off. */
  async getActiveMenu(cafeId: string) {
    const cafe = await prisma.cafe.findUnique({ where: { id: cafeId }, select: { autoScheduleMenus: true } });
    if (cafe?.autoScheduleMenus) {
      const scheduledType = resolveScheduledMenuType();
      const scheduled = await prisma.menu.findFirst({ where: { cafeId, type: scheduledType } });
      if (scheduled) return scheduled;
      // Falls through only if that menu type row somehow doesn't exist yet.
    }
    return prisma.menu.findFirst({ where: { cafeId, isActive: true } });
  },

  /** Clears any other active menu for the cafe before activating the target.
   *  Only takes visible effect while auto-schedule is off — otherwise the
   *  clock keeps deciding, and this just updates the flag for later. */
  async setActiveMenu(cafeId: string, menuId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.menu.updateMany({
        where: { cafeId, isActive: true },
        data: { isActive: false },
      });
      return tx.menu.update({ where: { id: menuId }, data: { isActive: true } });
    });
  },

  /** Toggles per-cafe auto-scheduling. Turning it off snaps the stored
   *  isActive flags to whatever the clock currently says, so nothing
   *  visibly changes at the moment of the switch — the owner then has a
   *  normal starting point to manually adjust from. */
  async setAutoSchedule(cafeId: string, enabled: boolean) {
    return prisma.$transaction(async (tx) => {
      if (!enabled) {
        const scheduledType = resolveScheduledMenuType();
        await tx.menu.updateMany({ where: { cafeId }, data: { isActive: false } });
        await tx.menu.updateMany({ where: { cafeId, type: scheduledType }, data: { isActive: true } });
      }
      return tx.cafe.update({ where: { id: cafeId }, data: { autoScheduleMenus: enabled } });
    });
  },

  async setMenuSubsidised(menuId: string, isSubsidised: boolean) {
    return prisma.menu.update({ where: { id: menuId }, data: { isSubsidised } });
  },

  /** Same dedupe/merge logic as getMenuForCafe, filtered to a single menu (+ global items). */
  async getMenuForMenuId(menuId: string) {
    const menu = await prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) return null;

    const menuCategories = await prisma.menuCategory.findMany({
      where: { menuId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    const globalCategories = await prisma.menuCategory.findMany({
      where: { cafeId: null, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    const allCategories = [...menuCategories, ...globalCategories];

    const menuItems = await prisma.menuItem.findMany({
      where: { menuId, isAvailable: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    });
    // Global items the cafe has overridden (edited/hidden from their
    // dashboard) are excluded below so customers see the cafe's own version
    // (already included in menuItems above) instead of the shared original.
    //
    // Deliberately queried rather than derived from menuItems: an override
    // that exists purely to *hide* a global item is unavailable by definition,
    // so it never appeared in the list above — which meant the shared original
    // sailed straight back onto the customer menu, the exact opposite of what
    // hiding it was for.
    const overrides = await prisma.menuItem.findMany({
      where: { menuId, overriddenFromId: { not: null } },
      select: { overriddenFromId: true },
    });
    const overriddenIds = overrides
      .map((i) => i.overriddenFromId)
      .filter((id): id is string => id !== null);
    // A global item with no menuType shows on every menu (backward-compatible
    // default); one tagged with a menuType only shows on that meal period.
    const globalItems = await prisma.menuItem.findMany({
      where: {
        cafeId: null,
        isAvailable: true,
        deletedAt: null,
        OR: [{ menuType: null }, { menuType: menu.type }],
        NOT: { id: { in: overriddenIds } },
      },
      orderBy: { sortOrder: "asc" },
    });
    const allItems = [...menuItems, ...globalItems];

    const mergedByName = new Map<string, (typeof allCategories)[number]>();
    for (const cat of allCategories) {
      const key = cat.name.trim().toLowerCase();
      const existing = mergedByName.get(key);
      if (!existing || cat.sortOrder < existing.sortOrder) {
        mergedByName.set(key, cat);
      }
    }
    const dedupedCategories = [...mergedByName.values()].sort((a, b) => a.sortOrder - b.sortOrder);

    const canonicalIdByOriginalId = new Map<string, string>();
    for (const cat of allCategories) {
      const canonical = mergedByName.get(cat.name.trim().toLowerCase())!;
      canonicalIdByOriginalId.set(cat.id, canonical.id);
    }

    const categories = dedupedCategories.map((cat) => ({
      ...cat,
      items: allItems.filter((i) => i.categoryId && canonicalIdByOriginalId.get(i.categoryId) === cat.id),
    }));

    const knownCatIds = new Set(allCategories.map((c) => c.id));
    const uncategorized = allItems.filter((i) => !i.categoryId || !knownCatIds.has(i.categoryId));

    return { menu, categories, uncategorized };
  },

  /**
   * A cafe "editing" a global item never mutates the shared row — it creates
   * (or updates, if one already exists) a cafe-specific copy pointing back at
   * the original via overriddenFromId. The original keeps showing unchanged
   * for every other cafe; getMenuForMenuId/getMenuBundle exclude it for this
   * cafe once the override exists. Used for edits, availability toggles, and
   * "remove from my menu" (an override with isAvailable: false) alike.
   */
  async upsertCafeOverride(
    originalItemId: string,
    cafeId: string,
    menuId: string,
    data: {
      name?: string;
      description?: string | null;
      pricePaise?: number;
      imageUrl?: string | null;
      isAvailable?: boolean;
      isVeg?: boolean;
      categoryId?: string;
      sortOrder?: number;
      isSubsidised?: boolean;
      deletedAt?: Date | null;
    }
  ) {
    const existingOverride = await prisma.menuItem.findFirst({
      where: { cafeId, overriddenFromId: originalItemId },
    });
    if (existingOverride) {
      const normalized = data.name !== undefined ? { ...data, name: toTitleCase(data.name) } : data;
      return prisma.menuItem.update({ where: { id: existingOverride.id }, data: normalized });
    }

    const original = await prisma.menuItem.findUnique({ where: { id: originalItemId } });
    if (!original || original.cafeId !== null) {
      throw new Error("Item is not a global item");
    }
    return prisma.menuItem.create({
      data: {
        cafeId,
        menuId,
        overriddenFromId: originalItemId,
        categoryId: data.categoryId ?? original.categoryId,
        name: toTitleCase(data.name ?? original.name),
        description: data.description !== undefined ? data.description : original.description,
        pricePaise: data.pricePaise ?? original.pricePaise,
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : original.imageUrl,
        isAvailable: data.isAvailable ?? original.isAvailable,
        isVeg: data.isVeg ?? original.isVeg,
        sortOrder: data.sortOrder ?? original.sortOrder,
        isSubsidised: data.isSubsidised ?? original.isSubsidised,
        deletedAt: data.deletedAt ?? null,
      },
    });
  },

  /** Items scoped to a specific menu (+ meal-period-matching global items) —
   *  used by order creation so a stale client can't order against an
   *  inactive/wrong menu, or a global item tagged for a different meal period. */
  async getMenuItemsByMenuId(itemIds: string[], menuId: string, menuType: MenuType) {
    return prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        isAvailable: true,
        deletedAt: null,
        OR: [
          { menuId },
          { cafeId: null, OR: [{ menuType: null }, { menuType }] },
        ],
      },
    });
  },
};
