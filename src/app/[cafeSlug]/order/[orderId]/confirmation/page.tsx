import { orderService } from "@/backend/services/order.service";
import { OrderConfirmation } from "@/frontend/components/customer/order-confirmation";
import { notFound } from "next/navigation";

interface OrderConfirmationPageProps {
  params: Promise<{ cafeSlug: string; orderId: string }>;
}

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { cafeSlug, orderId } = await params;
  const order = await orderService.getOrderStatus(orderId);

  if (!order) {
    notFound();
  }

  return <OrderConfirmation cafeSlug={cafeSlug} order={order} />;
}

export const metadata = {
  title: "Order Confirmed | Scan&Pay",
  description: "Your order has been placed",
};
