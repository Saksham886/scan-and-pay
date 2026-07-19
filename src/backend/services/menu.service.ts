import { menuRepository } from "@/backend/repositories/menu.repository";
import type { CafePublic, MenuCategoryWithItems, MenuItemPublic } from "@/shared/types";

export const menuService = {
  async getCafeMenu(slug: string): Promise<{
    cafe: CafePublic;
    categories: MenuCategoryWithItems[];
  } | null> {
    const cafe = await menuRepository.getCafeBySlug(slug);
    if (!cafe) return null;

    const { categories, uncategorized } = await menuRepository.getMenuForCafe(cafe.id);

    const result: MenuCategoryWithItems[] = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      sortOrder: cat.sortOrder,
      items: cat.items.map(mapMenuItem),
    }));

    if (uncategorized.length > 0) {
      result.push({
        id: "uncategorized",
        name: "Other",
        sortOrder: 999,
        items: uncategorized.map(mapMenuItem),
      });
    }

    return {
      cafe: {
        id: cafe.id,
        name: cafe.name,
        slug: cafe.slug,
        address: cafe.address,
        phone: cafe.phone,
        imageUrl: cafe.imageUrl,
        openingTime: cafe.openingTime,
        closingTime: cafe.closingTime,
      },
      categories: result,
    };
  },
};

function mapMenuItem(item: {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  categoryId: string | null;
}): MenuItemPublic {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    pricePaise: item.pricePaise,
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    isVeg: item.isVeg,
    categoryId: item.categoryId,
  };
}
