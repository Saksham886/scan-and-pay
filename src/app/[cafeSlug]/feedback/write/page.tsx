import { menuService } from "@/backend/services/menu.service";
import { WrittenFeedbackScreen } from "@/frontend/components/customer/written-feedback-screen";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface WriteFeedbackPageProps {
  params: Promise<{ cafeSlug: string }>;
}

export default async function WriteFeedbackPage({ params }: WriteFeedbackPageProps) {
  const { cafeSlug } = await params;
  const meta = await menuService.getCafeMeta(cafeSlug);

  if (!meta) {
    notFound();
  }

  return <WrittenFeedbackScreen cafeSlug={cafeSlug} cafeName={meta.cafe.name} />;
}

export const metadata = {
  title: "Write Feedback | Scan&Pay",
  description: "Share your feedback in your own words",
};
