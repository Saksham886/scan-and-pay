import { menuService } from "@/backend/services/menu.service";
import { HomeScreen } from "@/frontend/components/customer/home-screen";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CafeHomePageProps {
  params: Promise<{ cafeSlug: string }>;
}

export default async function CafeHomePage({ params }: CafeHomePageProps) {
  const { cafeSlug } = await params;
  const meta = await menuService.getCafeMeta(cafeSlug);

  if (!meta) {
    notFound();
  }

  return <HomeScreen cafeSlug={cafeSlug} meta={meta} />;
}

export async function generateMetadata({ params }: CafeHomePageProps) {
  const { cafeSlug } = await params;
  const meta = await menuService.getCafeMeta(cafeSlug);

  if (!meta) {
    return { title: "Cafe Not Found" };
  }

  return {
    title: `${meta.cafe.name} | Scan&Pay`,
    description: `Order from ${meta.cafe.name}`,
    manifest: `/${cafeSlug}/manifest.webmanifest`,
  };
}
