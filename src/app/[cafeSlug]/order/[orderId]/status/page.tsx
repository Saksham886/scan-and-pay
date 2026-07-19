import { OrderStatusTracker } from "@/frontend/components/customer/order-status-tracker";

interface OrderStatusPageProps {
  params: Promise<{ cafeSlug: string; orderId: string }>;
}

export default async function OrderStatusPage({ params }: OrderStatusPageProps) {
  const { orderId } = await params;

  return <OrderStatusTracker orderId={orderId} />;
}

export const metadata = {
  title: "Order Status | Scan&Pay",
  description: "Track your order status in real-time",
};
