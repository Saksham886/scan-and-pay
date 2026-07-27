import { menuRepository } from "@/backend/repositories/menu.repository";
import type { CafePublic, CafeMeta, MenuCategoryWithItems, MenuItemPublic } from "@/shared/types";

function mapCafePublic(cafe: {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  imageUrl: string | null;
  openingTime: string | null;
  closingTime: string | null;
}): CafePublic {
  return {
    id: cafe.id,
    name: cafe.name,
    slug: cafe.slug,
    address: cafe.address,
    phone: cafe.phone,
    imageUrl: cafe.imageUrl,
    openingTime: cafe.openingTime,
    closingTime: cafe.closingTime,
  };
}

export const menuService = {
  /** Lightweight cafe + active-menu check, powers the customer home screen. */
  async getCafeMeta(slug: string): Promise<CafeMeta | null> {
    const cafe = await menuRepository.getCafeBySlug(slug);
    if (!cafe) return null;

    const activeMenu = await menuRepository.getActiveMenu(cafe.id);

    return {
      cafe: mapCafePublic(cafe),
      activeMenu: activeMenu
        ? { id: activeMenu.id, type: activeMenu.type, isSubsidised: activeMenu.isSubsidised }
        : null,
    };
  },

  async getCafeMenu(slug: string): Promise<{
    cafe: CafePublic;
    menu: { id: string; type: string; isSubsidised: boolean } | null;
    categories: MenuCategoryWithItems[];
  } | null> {
    const cafe = await menuRepository.getCafeBySlug(slug);
    if (!cafe) return null;

    const activeMenu = await menuRepository.getActiveMenu(cafe.id);
    if (!activeMenu) {
      return { cafe: mapCafePublic(cafe), menu: null, categories: [] };
    }

    const menuBundle = await menuRepository.getMenuForMenuId(activeMenu.id);
    const { categories, uncategorized } = menuBundle!;

    const result: MenuCategoryWithItems[] = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      items: cat.items.map((item) => mapMenuItem(item, activeMenu.isSubsidised)),
    }));

    if (uncategorized.length > 0) {
      result.push({
        id: "uncategorized",
        name: "Other",
        sortOrder: 999,
        items: uncategorized.map((item) => mapMenuItem(item, activeMenu.isSubsidised)),
      });
    }

    return {
      cafe: mapCafePublic(cafe),
      menu: { id: activeMenu.id, type: activeMenu.type, isSubsidised: activeMenu.isSubsidised },
      categories: result,
    };
  },
};

function mapMenuItem(
  item: {
    id: string;
    name: string;
    description: string | null;
    pricePaise: number;
    imageUrl: string | null;
    isAvailable: boolean;
    isVeg: boolean;
    categoryId: string | null;
    isSubsidised: boolean;
  },
  menuIsSubsidised = false
): MenuItemPublic {
  const effectiveSubsidised = menuIsSubsidised || item.isSubsidised;
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    pricePaise: effectiveSubsidised ? null : item.pricePaise,
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    isVeg: item.isVeg,
    categoryId: item.categoryId,
  };
}
