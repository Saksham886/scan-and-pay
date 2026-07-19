import { NextResponse } from "next/server";
import { orderRepository } from "@/backend/repositories/order.repository";
import { paymentRepository } from "@/backend/repositories/payment.repository";
import { sseManager } from "@/backend/lib/sse";
import { notifyOrderPlaced } from "@/backend/lib/whatsapp";

// Only active when PHONEPE_TEST_MODE=true - simulates a successful payment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.PHONEPE_TEST_MODE !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { id: orderId } = await params;
  const { searchParams } = new URL(request.url);
  const txn = searchParams.get("txn");
  const redirect = searchParams.get("redirect");

  if (!orderId || orderId === "null" || !txn) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const order = await orderRepository.getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "PAYMENT_PENDING" || order.status === "CREATED") {
    await paymentRepository.updatePaymentStatus(txn, {
      status: "SUCCESS",
      phonepeTxnId: `TEST-${txn}`,
      paymentMethod: "TEST_MODE",
      paidAt: new Date(),
    });
    await orderRepository.updateOrderStatus(orderId, "PAID");

    // Fetch updated order for accurate SSE broadcast
    const updatedOrder = await orderRepository.getOrderById(orderId);
    if (updatedOrder) {
      sseManager.sendToCafe(updatedOrder.cafeId, "new_order", {
        type: "new_order",
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          totalPaise: updatedOrder.totalPaise,
          customerName: updatedOrder.customerName,
          customerPhone: updatedOrder.customerPhone,
          notes: updatedOrder.notes,
          createdAt: updatedOrder.createdAt.toISOString(),
          updatedAt: updatedOrder.updatedAt.toISOString(),
          cafeId: updatedOrder.cafeId,
          cafeName: updatedOrder.cafe?.name,
          cafeSlug: updatedOrder.cafe?.slug,
          items: updatedOrder.items.map((i) => ({
            id: i.id,
            itemName: i.itemName,
            itemPricePaise: i.itemPricePaise,
            quantity: i.quantity,
            subtotalPaise: i.subtotalPaise,
          })),
        },
      });

      if (updatedOrder.customerPhone) {
        await notifyOrderPlaced({
          customerPhone: updatedOrder.customerPhone,
          customerName: updatedOrder.customerName || "there",
          orderNumber: updatedOrder.orderNumber,
          totalPaise: updatedOrder.totalPaise,
          cafeName: updatedOrder.cafe?.name || "the cafe",
          items: updatedOrder.items.map((i) => ({
            itemName: i.itemName,
            quantity: i.quantity,
            subtotalPaise: i.subtotalPaise,
          })),
        }).catch(() => {});
      }
    }
  }

  const returnUrl = redirect
    ? decodeURIComponent(redirect)
    : `/${order.cafe?.slug ?? order.cafeId}`;

  return NextResponse.redirect(returnUrl);
}
