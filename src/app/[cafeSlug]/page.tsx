import { menuService } from "@/backend/services/menu.service";
import { MenuPageClient } from "@/frontend/components/customer/menu-page-client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CafeMenuPageProps {
  params: Promise<{ cafeSlug: string }>;
}

export default async function CafeMenuPage({ params }: CafeMenuPageProps) {
  const { cafeSlug } = await params;
  const data = await menuService.getCafeMenu(cafeSlug);

  if (!data) {
    notFound();
  }

  return <MenuPageClient cafe={data.cafe} categories={data.categories} />;
}

export async function generateMetadata({ params }: CafeMenuPageProps) {
  const { cafeSlug } = await params;
  const data = await menuService.getCafeMenu(cafeSlug);

  if (!data) {
    return { title: "Cafe Not Found" };
  }

  return {
    title: `${data.cafe.name} - Menu | Scan&Pay`,
    description: `Browse the menu and order from ${data.cafe.name}`,
  };
}
