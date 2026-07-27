import { menuService } from "@/backend/services/menu.service";
import { FeedbackScreen } from "@/frontend/components/customer/feedback-screen";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface FeedbackPageProps {
  params: Promise<{ cafeSlug: string }>;
}

export default async function FeedbackPage({ params }: FeedbackPageProps) {
  const { cafeSlug } = await params;
  const meta = await menuService.getCafeMeta(cafeSlug);

  if (!meta) {
    notFound();
  }

  return <FeedbackScreen cafeSlug={cafeSlug} cafeName={meta.cafe.name} />;
}

export const metadata = {
  title: "Feedback | Scan&Pay",
  description: "Share your feedback",
};
