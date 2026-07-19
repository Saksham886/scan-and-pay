"use client";

import { useState } from "react";
import { Card } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { StatusBadge } from "@/frontend/components/ui/status-badge";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import { Clock, User, Phone, ChefHat, Package, CheckCircle2, XCircle, Store } from "lucide-react";
import type { DashboardOrder } from "@/shared/types";
import type { OrderStatus } from "@/generated/prisma";

interface OrderCardProps {
  order: DashboardOrder;
  onStatusUpdate: (orderId: string, status: OrderStatus) => Promise<void>;
  showBranch?: boolean;
}

const nextStatus: Partial<Record<OrderStatus, { label: string; status: OrderStatus; icon: React.ReactNode }>> = {
  PAID: { label: "Start Preparing", status: "PREPARING", icon: <ChefHat size={16} /> },
  PREPARING: { label: "Mark Ready", status: "READY", icon: <Package size={16} /> },
  READY: { label: "Complete", status: "COMPLETED", icon: <CheckCircle2 size={16} /> },
};

export function OrderCard({ order, onStatusUpdate, showBranch = false }: OrderCardProps) {
  const [loading, setLoading] = useState(false);
  const next = nextStatus[order.status];

  const timeAgo = getTimeAgo(order.createdAt);

  const handleUpdate = async (status: OrderStatus) => {
    setLoading(true);
    try {
      await onStatusUpdate(order.id, status);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Branch badge (admin view only) */}
      {showBranch && order.cafeName && (
        <div className="flex items-center gap-1.5 mb-2 -mt-1">
          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full">
            <Store size={11} />
            {order.cafeName}
          </span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base">#{order.orderNumber}</h3>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {timeAgo}
            </span>
            {order.customerName && (
              <span className="flex items-center gap-1">
                <User size={12} />
                {order.customerName}
              </span>
            )}
            {order.customerPhone && (
              <span className="flex items-center gap-1">
                <Phone size={12} />
                {order.customerPhone}
              </span>
            )}
          </div>
        </div>
        <p className="font-bold text-primary text-lg">
          {paiseToCurrencyShort(order.totalPaise)}
        </p>
      </div>

      {/* Items */}
      <div className="bg-background rounded-xl p-3 mb-3">
        <div className="space-y-1">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                <span className="font-medium">{item.quantity}x</span>{" "}
                <span className="text-muted">{item.itemName}</span>
              </span>
              <span className="text-muted text-xs">
                {paiseToCurrencyShort(item.subtotalPaise)}
              </span>
            </div>
          ))}
        </div>
        {order.notes && (
          <p className="mt-2 pt-2 border-t border-border text-xs text-muted italic">
            Note: {order.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {next && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleUpdate(next.status)}
            loading={loading}
            className="flex-1"
          >
            {next.icon}
            <span className="ml-1.5">{next.label}</span>
          </Button>
          {order.status !== "COMPLETED" && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleUpdate("CANCELLED")}
              loading={loading}
            >
              <XCircle size={16} />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
