import { orderRepository } from "@/backend/repositories/order.repository";
import { sseManager } from "@/backend/lib/sse";
import { notifyOrderPlaced } from "@/backend/lib/whatsapp";

export type FullOrder = NonNullable<Awaited<ReturnType<typeof orderRepository.getOrderById>>>;

export async function sendOrderPlacedWhatsApp(fullOrder: FullOrder) {
  if (!fullOrder.customerPhone) return;
  try {
    await notifyOrderPlaced({
      customerPhone: fullOrder.customerPhone,
      customerName: fullOrder.customerName || "there",
      orderNumber: fullOrder.orderNumber,
      totalPaise: fullOrder.totalPaise,
      cafeName: fullOrder.cafe?.name || "the cafe",
      items: fullOrder.items.map((i) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        subtotalPaise: i.subtotalPaise,
      })),
    });
  } catch (err) {
    console.error("[WhatsApp] notifyOrderPlaced failed:", err);
  }
}

export function broadcastNewOrder(fullOrder: FullOrder) {
  sseManager.sendToCafe(fullOrder.cafeId, "new_order", {
    type: "new_order",
    order: {
      id: fullOrder.id,
      orderNumber: fullOrder.orderNumber,
      status: fullOrder.status,
      totalPaise: fullOrder.totalPaise,
      customerName: fullOrder.customerName,
      customerPhone: fullOrder.customerPhone,
      notes: fullOrder.notes,
      createdAt: fullOrder.createdAt.toISOString(),
      updatedAt: fullOrder.updatedAt.toISOString(),
      cafeId: fullOrder.cafeId,
      cafeName: fullOrder.cafe?.name ?? null,
      cafeSlug: fullOrder.cafe?.slug,
      isSubsidised: fullOrder.payments.length === 0,
      chargeablePaise: fullOrder.items.reduce((sum, i) => sum + (i.isSubsidised ? 0 : i.subtotalPaise), 0),
      items: fullOrder.items.map((i) => ({
        id: i.id,
        itemName: i.itemName,
        itemPricePaise: i.itemPricePaise,
        quantity: i.quantity,
        subtotalPaise: i.subtotalPaise,
        isSubsidised: i.isSubsidised,
      })),
    },
  });
}
