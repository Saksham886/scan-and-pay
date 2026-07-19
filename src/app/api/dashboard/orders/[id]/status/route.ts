import { NextResponse } from "next/server";
import { auth } from "@/backend/lib/auth";
import { orderService } from "@/backend/services/order.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    const VALID_STATUSES = ["CREATED","PAYMENT_PENDING","PAID","PREPARING","READY","COMPLETED","CANCELLED"];
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing status" },
        { status: 400 }
      );
    }

    const cafeId = session.user.role === "SUPER_ADMIN" ? undefined : session.user.cafeId || undefined;

    const updated = await orderService.updateOrderStatus(id, status, cafeId);

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    const status = message.includes("Unauthorized") ? 403 : message.includes("Cannot transition") ? 422 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
