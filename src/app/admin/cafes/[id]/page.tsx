"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Modal } from "@/frontend/components/ui/modal";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import { cn } from "@/shared/utils/cn";
import { Input } from "@/frontend/components/ui/input";
import {
  ArrowLeft,
  DollarSign,
  ShoppingBag,
  Trash2,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  TrendingUp,
  CalendarDays,
  KeyRound,
  User,
  QrCode,
  Users,
  Plus,
  UserMinus,
  Pencil,
  UtensilsCrossed,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { CafeQRModal } from "@/frontend/components/admin/cafe-qr-modal";
import type { OrderStatus } from "@/generated/prisma";

interface CafeOwner {
  id: string;
  name: string;
  email: string;
}

interface StaffMember {
  id: string;
  name: string;
  age: number;
  mobileNumber: string;
}

interface CafeDetail {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  imageUrl: string | null;
  isActive: boolean;
  openingTime: string | null;
  closingTime: string | null;
  phonepeMerchantId: string | null;
  phonepeSaltIndex: string | null;
  paymentProvider: "PHONEPE" | "RAZORPAY";
  razorpayKeyId: string | null;
  _count: { orders: number; menuItems: number; users: number };
  users: CafeOwner[];
}

interface CafeAnalytics {
  orders: number;
  revenue: number;
  range: string;
  from: string;
  to: string;
  recentOrders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalPaise: number;
    customerName: string | null;
    createdAt: string;
  }[];
}

type TimeRange = "today" | "week" | "month" | "year" | "all";

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

const statusColors: Record<string, string> = {
  PAID: "text-info bg-info/20",
  PREPARING: "text-warning bg-warning/10",
  READY: "text-primary bg-primary/10",
  COMPLETED: "text-success bg-success/20",
  CANCELLED: "text-danger bg-danger/10",
  FAILED: "text-danger bg-danger/10",
};

export default function AdminCafeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [cafe, setCafe] = useState<CafeDetail | null>(null);
  const [analytics, setAnalytics] = useState<CafeAnalytics | null>(null);
  const [range, setRange] = useState<TimeRange>("all");
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editOpeningTime, setEditOpeningTime] = useState("");
  const [editClosingTime, setEditClosingTime] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Staff state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffAge, setStaffAge] = useState("");
  const [staffMobile, setStaffMobile] = useState("");
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);
  const [removing, setRemoving] = useState(false);

  // Payment settings state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalTab, setPaymentModalTab] = useState<"PHONEPE" | "RAZORPAY">("PHONEPE");
  const [paymentMerchantId, setPaymentMerchantId] = useState("");
  const [paymentSaltKey, setPaymentSaltKey] = useState("");
  const [paymentSaltIndex, setPaymentSaltIndex] = useState("1");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [showSaltKey, setShowSaltKey] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState("");
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [switchingProvider, setSwitchingProvider] = useState(false);

  const fetchCafe = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/cafes/${id}`);
      const data = await res.json();
      if (data.success) setCafe(data.data);
    } catch {
      console.error("Failed to fetch cafe");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/cafes/${id}/staff`);
      const data = await res.json();
      if (data.success) setStaff(data.data);
    } catch {
      console.error("Failed to fetch staff");
    }
  }, [id]);

  const handleAddStaff = async () => {
    setStaffError("");
    if (!staffName.trim()) { setStaffError("Name is required"); return; }
    if (!staffAge || isNaN(Number(staffAge))) { setStaffError("Valid age is required"); return; }
    if (!staffMobile.trim()) { setStaffError("Mobile number is required"); return; }
    setStaffSaving(true);
    try {
      const res = await fetch(`/api/admin/cafes/${id}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: staffName, age: Number(staffAge), mobileNumber: staffMobile }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddStaffModal(false);
        setStaffName(""); setStaffAge(""); setStaffMobile(""); setStaffError("");
        fetchStaff();
      } else {
        setStaffError(data.error || "Failed to add staff");
      }
    } catch {
      setStaffError("Network error");
    } finally {
      setStaffSaving(false);
    }
  };

  const handleRemoveStaff = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/cafes/${id}/staff/${removeTarget.id}`, { method: "DELETE" });
      if (res.ok) { setRemoveTarget(null); fetchStaff(); }
    } catch {
      console.error("Failed to remove staff");
    } finally {
      setRemoving(false);
    }
  };

  const openPaymentModal = (tab: "PHONEPE" | "RAZORPAY" = cafe?.paymentProvider ?? "PHONEPE") => {
    setPaymentModalTab(tab);
    setPaymentMerchantId(cafe?.phonepeMerchantId ?? "");
    setPaymentSaltKey("");
    setPaymentSaltIndex(cafe?.phonepeSaltIndex ?? "1");
    setRazorpayKeyId(cafe?.razorpayKeyId ?? "");
    setRazorpayKeySecret("");
    setRazorpayWebhookSecret("");
    setPaymentError("");
    setShowSaltKey(false);
    setShowRazorpaySecret(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSave = async () => {
    setPaymentError("");

    if (paymentModalTab === "RAZORPAY") {
      if (!razorpayKeyId.trim()) { setPaymentError("Key ID is required"); return; }
      if (!razorpayKeySecret.trim() && !cafe?.razorpayKeyId) { setPaymentError("Key Secret is required"); return; }
      setPaymentSaving(true);
      try {
        const res = await fetch(`/api/admin/cafes/${id}/payment-settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "RAZORPAY",
            razorpayKeyId,
            razorpayKeySecret,
            razorpayWebhookSecret,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setShowPaymentModal(false);
          fetchCafe();
        } else {
          setPaymentError(data.error || "Failed to save payment settings");
        }
      } catch {
        setPaymentError("Network error");
      } finally {
        setPaymentSaving(false);
      }
      return;
    }

    if (!paymentMerchantId.trim()) { setPaymentError("Merchant ID is required"); return; }
    // Only require salt key on first-time setup; for updates, blank = keep existing
    if (!paymentSaltKey.trim() && !cafe?.phonepeMerchantId) { setPaymentError("Salt Key is required"); return; }
    setPaymentSaving(true);
    try {
      const res = await fetch(`/api/admin/cafes/${id}/payment-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phonepeMerchantId: paymentMerchantId,
          phonepeSaltKey: paymentSaltKey,
          phonepeSaltIndex: paymentSaltIndex,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowPaymentModal(false);
        fetchCafe();
      } else {
        setPaymentError(data.error || "Failed to save payment settings");
      }
    } catch {
      setPaymentError("Network error");
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleProviderSwitch = async (provider: "PHONEPE" | "RAZORPAY") => {
    if (!cafe || cafe.paymentProvider === provider) return;
    setSwitchingProvider(true);
    try {
      const res = await fetch(`/api/admin/cafes/${id}/payment-provider`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) fetchCafe();
    } catch {
      console.error("Failed to switch payment provider");
    } finally {
      setSwitchingProvider(false);
    }
  };

  const fetchAnalytics = useCallback(async (r: TimeRange) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/cafes/${id}/analytics?range=${r}`);
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch {
      console.error("Failed to fetch analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCafe();
    fetchAnalytics(range);
    fetchStaff();
  }, [fetchCafe, fetchAnalytics, fetchStaff, range]);

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/cafes/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin");
      }
    } catch {
      console.error("Failed to delete cafe");
    } finally {
      setDeleting(false);
    }
  };

  const owner = cafe?.users?.[0] || null;

  const handleResetPassword = async () => {
    if (!owner || !newPassword) return;
    if (newPassword.length < 6) { setResetMessage("Password must be at least 6 characters"); return; }
    setResetLoading(true);
    setResetMessage("");
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: owner.id, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage("Password reset successfully!");
        setNewPassword("");
        setTimeout(() => { setShowResetModal(false); setResetMessage(""); }, 1500);
      } else {
        setResetMessage(data.error || "Failed to reset password");
      }
    } catch {
      setResetMessage("Network error");
    } finally {
      setResetLoading(false);
    }
  };

  const openEditModal = () => {
    if (!cafe) return;
    setEditName(cafe.name);
    setEditAddress(cafe.address ?? "");
    setEditPhone(cafe.phone ?? "");
    setEditOpeningTime(cafe.openingTime ?? "");
    setEditClosingTime(cafe.closingTime ?? "");
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    setEditError("");
    if (!editName.trim()) { setEditError("Cafe name is required"); return; }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/cafes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          address: editAddress,
          phone: editPhone,
          openingTime: editOpeningTime,
          closingTime: editClosingTime,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditModal(false);
        fetchCafe();
      } else {
        setEditError(data.error || "Failed to update cafe");
      }
    } catch {
      setEditError("Network error");
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-surface-hover rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-5 animate-pulse h-24" />
          ))}
        </div>
        <div className="bg-surface rounded-2xl border border-border animate-pulse h-64" />
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-semibold mb-2">Cafe not found</p>
        <Button variant="secondary" onClick={() => router.push("/admin")}>
          <ArrowLeft size={16} className="mr-1.5" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin")}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold">{cafe.name}</h1>
              <Badge variant={cafe.isActive ? "success" : "danger"}>
                {cafe.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted">
              {cafe.address && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {cafe.address}
                </span>
              )}
              {cafe.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={14} /> {cafe.phone}
                </span>
              )}
              {cafe.openingTime && cafe.closingTime && (
                <span className="flex items-center gap-1">
                  <Clock size={14} /> {cafe.openingTime} - {cafe.closingTime}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/${cafe.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink size={14} />
              Customer View
            </a>
            <Button size="sm" variant="secondary" onClick={() => router.push(`/admin/cafes/${id}/menu`)}>
              <UtensilsCrossed size={14} className="mr-1" />
              Manage Menu
            </Button>
            <Button size="sm" variant="secondary" onClick={openEditModal}>
              <Pencil size={14} className="mr-1" />
              Edit
            </Button>
            <Button size="sm" onClick={() => setShowQRModal(true)}>
              <QrCode size={14} className="mr-1" />
              QR Code
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={14} className="mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold">{cafe._count.orders}</p>
            <p className="text-xs text-muted">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold">{cafe._count.menuItems}</p>
            <p className="text-xs text-muted">Menu Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold">{cafe._count.users}</p>
            <p className="text-xs text-muted">Staff</p>
          </CardContent>
        </Card>
      </div>

      {/* Owner Info */}
      {owner && (
        <div className="bg-surface rounded-2xl border border-border p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <User size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{owner.name}</p>
              <p className="text-xs text-muted">{owner.email}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setShowResetModal(true); setResetMessage(""); setNewPassword(""); }}
          >
            <KeyRound size={14} className="mr-1" />
            Reset Password
          </Button>
        </div>
      )}

      {/* Payment Settings */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <CreditCard size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Payment Gateway</p>
              <p className="text-xs text-muted mt-0.5">
                Active: <span className="font-mono">{cafe.paymentProvider === "RAZORPAY" ? "Razorpay" : "PhonePe"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-background rounded-xl border border-border p-1">
            {(["PHONEPE", "RAZORPAY"] as const).map((p) => (
              <button
                key={p}
                disabled={switchingProvider}
                onClick={() => handleProviderSwitch(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50",
                  cafe.paymentProvider === p ? "bg-primary text-white" : "text-muted hover:text-foreground"
                )}
              >
                {p === "PHONEPE" ? "PhonePe" : "Razorpay"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-xs font-semibold">PhonePe</p>
            {cafe.phonepeMerchantId ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={12} className="text-green-600" />
                <p className="text-xs text-green-700">
                  Merchant ID: <span className="font-mono">{cafe.phonepeMerchantId}</span>
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <AlertCircle size={12} className="text-amber-600" />
                <p className="text-xs text-amber-700">Not configured</p>
              </div>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={() => openPaymentModal("PHONEPE")}>
            <Pencil size={14} className="mr-1" />
            {cafe.phonepeMerchantId ? "Update" : "Configure"}
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-xs font-semibold">Razorpay</p>
            {cafe.razorpayKeyId ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={12} className="text-green-600" />
                <p className="text-xs text-green-700">
                  Key ID: <span className="font-mono">{cafe.razorpayKeyId}</span>
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <AlertCircle size={12} className="text-amber-600" />
                <p className="text-xs text-amber-700">Not configured</p>
              </div>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={() => openPaymentModal("RAZORPAY")}>
            <Pencil size={14} className="mr-1" />
            {cafe.razorpayKeyId ? "Update" : "Configure"}
          </Button>
        </div>
      </div>

      {/* Time Range Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          Revenue & Orders
        </h2>
        <div className="flex items-center gap-1 bg-surface rounded-xl border border-border p-1 overflow-x-auto">
          {timeRanges.map((tr) => (
            <button
              key={tr.value}
              onClick={() => handleRangeChange(tr.value)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-100",
                range === tr.value
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success/20 text-success">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs text-muted">
                {timeRanges.find((t) => t.value === range)?.label} Revenue
              </p>
              <p className="text-xl font-bold">
                {analyticsLoading ? "..." : paiseToCurrencyShort(analytics?.revenue || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-info/20 text-info">
              <ShoppingBag size={20} />
            </div>
            <div>
              <p className="text-xs text-muted">
                {timeRanges.find((t) => t.value === range)?.label} Orders
              </p>
              <p className="text-xl font-bold">
                {analyticsLoading ? "..." : (analytics?.orders || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={16} className="text-muted" />
        <h3 className="font-semibold text-sm">Recent Orders</h3>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {analyticsLoading ? (
          <div className="px-5 py-8 text-center text-muted text-sm">Loading...</div>
        ) : !analytics?.recentOrders.length ? (
          <div className="px-5 py-8 text-center text-muted text-sm">
            No orders in this time period
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {analytics.recentOrders.map((order) => (
                <div key={order.id} className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{order.orderNumber}</span>
                    <span className="font-medium text-sm">{paiseToCurrencyShort(order.totalPaise)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">{order.customerName || "Guest"}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", statusColors[order.status] || "text-muted bg-surface")}>
                        {order.status}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-background border-b border-border text-xs font-medium text-muted">
                <span>Order #</span>
                <span>Customer</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Date</span>
              </div>
              {analytics.recentOrders.map((order, i) => (
                <div
                  key={order.id}
                  className={cn(
                    "grid grid-cols-5 gap-4 px-5 py-3 text-sm items-center",
                    i < analytics.recentOrders.length - 1 && "border-b border-border"
                  )}
                >
                  <span className="font-medium">{order.orderNumber}</span>
                  <span className="text-muted truncate">{order.customerName || "Guest"}</span>
                  <span>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", statusColors[order.status] || "text-muted bg-surface")}>
                      {order.status}
                    </span>
                  </span>
                  <span className="text-right font-medium">{paiseToCurrencyShort(order.totalPaise)}</span>
                  <span className="text-right text-muted text-xs">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Staff Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={18} className="text-primary" />
            Staff ({staff.length})
          </h2>
          <Button size="sm" onClick={() => { setShowAddStaffModal(true); setStaffError(""); }}>
            <Plus size={14} className="mr-1" />
            Add Staff
          </Button>
        </div>

        {staff.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border p-8 text-center text-muted text-sm">
            No staff added yet
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {staff.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{member.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted mt-0.5">Age {member.age} · {member.mobileNumber}</p>
                  </div>
                  <button
                    onClick={() => setRemoveTarget(member)}
                    className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                    title="Remove staff"
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-background border-b border-border text-xs font-medium text-muted">
                <span>Name</span>
                <span>Age</span>
                <span>Mobile</span>
                <span></span>
              </div>
              {staff.map((member, i) => (
                <div
                  key={member.id}
                  className={cn(
                    "grid grid-cols-4 gap-4 px-5 py-3 text-sm items-center",
                    i < staff.length - 1 && "border-b border-border"
                  )}
                >
                  <span className="font-medium">{member.name}</span>
                  <span className="text-muted">{member.age}</span>
                  <span className="text-muted">{member.mobileNumber}</span>
                  <span className="flex justify-end">
                    <button
                      onClick={() => setRemoveTarget(member)}
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Remove staff"
                    >
                      <UserMinus size={14} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <Modal isOpen={showAddStaffModal} onClose={() => setShowAddStaffModal(false)} title="Add Staff Member">
        <div className="space-y-4">
          <Input id="staff-name" label="Name" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Full name" required />
          <Input id="staff-age" label="Age" type="number" value={staffAge} onChange={(e) => setStaffAge(e.target.value)} placeholder="e.g. 25" required />
          <Input id="staff-mobile" label="Mobile Number" value={staffMobile} onChange={(e) => setStaffMobile(e.target.value)} placeholder="e.g. +91 98765 43210" required />
          {staffError && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-xl border border-danger/25">{staffError}</div>
          )}
          <Button onClick={handleAddStaff} className="w-full" loading={staffSaving}>
            <Plus size={14} className="mr-1" /> Add Staff
          </Button>
        </div>
      </Modal>

      {/* Remove Staff Confirmation */}
      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Staff">
        {removeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Remove <strong className="text-foreground">{removeTarget.name}</strong> from this cafe?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setRemoveTarget(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" loading={removing} onClick={handleRemoveStaff}>
                <UserMinus size={14} className="mr-1" /> Remove
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Cafe Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Cafe Details">
        <div className="space-y-4">
          <Input
            id="edit-name"
            label="Cafe Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g. Brew & Bites"
            required
          />
          <Input
            id="edit-address"
            label="Address"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            placeholder="e.g. 123 Main Street"
          />
          <Input
            id="edit-phone"
            label="Phone"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="e.g. +91 98765 43210"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="edit-opening"
              label="Opening Time"
              value={editOpeningTime}
              onChange={(e) => setEditOpeningTime(e.target.value)}
              placeholder="e.g. 08:00"
            />
            <Input
              id="edit-closing"
              label="Closing Time"
              value={editClosingTime}
              onChange={(e) => setEditClosingTime(e.target.value)}
              placeholder="e.g. 22:00"
            />
          </div>
          {editError && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-xl border border-danger/25">{editError}</div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={editSaving} onClick={handleEditSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <CafeQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        cafeName={cafe.name}
        cafeSlug={cafe.slug}
      />

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Owner Password"
      >
        {owner && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Reset password for <strong className="text-foreground">{owner.name}</strong> ({owner.email})
            </p>
            <Input
              id="new-password"
              label="New Password"
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {resetMessage && (
              <div className={cn(
                "text-sm p-3 rounded-xl border",
                resetMessage.includes("successfully")
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-danger border-red-200"
              )}>
                {resetMessage}
              </div>
            )}
            <Button onClick={handleResetPassword} className="w-full" loading={resetLoading}>
              <KeyRound size={14} className="mr-1" />
              Reset Password
            </Button>
          </div>
        )}
      </Modal>

      {/* Payment Settings Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Payment Gateway Settings">
        <div className="space-y-4">
          <div className="flex items-center gap-1 bg-background rounded-xl border border-border p-1">
            {(["PHONEPE", "RAZORPAY"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPaymentModalTab(p)}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  paymentModalTab === p ? "bg-primary text-white" : "text-muted hover:text-foreground"
                )}
              >
                {p === "PHONEPE" ? "PhonePe" : "Razorpay"}
              </button>
            ))}
          </div>

          {paymentModalTab === "PHONEPE" ? (
            <>
              <div className="bg-info/20 border border-info/25 rounded-xl p-3 text-xs text-info">
                Enter the PhonePe Business credentials for <strong>{cafe.name}</strong>. Payments from customers will be collected directly into this cafe owner&apos;s PhonePe-linked bank account.
              </div>
              <Input
                id="payment-merchant-id"
                label="Merchant ID"
                value={paymentMerchantId}
                onChange={(e) => setPaymentMerchantId(e.target.value)}
                placeholder="e.g. MERCHANTUAT"
                required
              />
              <div className="space-y-1">
                <label className="block text-xs font-medium text-foreground">
                  Salt Key <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSaltKey ? "text" : "password"}
                    value={paymentSaltKey}
                    onChange={(e) => setPaymentSaltKey(e.target.value)}
                    placeholder={cafe.phonepeMerchantId ? "Enter new salt key to update" : "Paste salt key from PhonePe dashboard"}
                    className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSaltKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {showSaltKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {cafe.phonepeMerchantId && (
                  <p className="text-xs text-muted">Leave blank to keep the existing salt key.</p>
                )}
              </div>
              <Input
                id="payment-salt-index"
                label="Salt Index"
                value={paymentSaltIndex}
                onChange={(e) => setPaymentSaltIndex(e.target.value)}
                placeholder="1"
              />
            </>
          ) : (
            <>
              <div className="bg-info/20 border border-info/25 rounded-xl p-3 text-xs text-info">
                Enter the Razorpay API credentials for <strong>{cafe.name}</strong>, from Settings &gt; API Keys in the Razorpay dashboard. Register the webhook URL there too and paste its secret below.
              </div>
              <Input
                id="razorpay-key-id"
                label="Key ID"
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
                placeholder="rzp_test_xxxxxxxxxxxx"
                required
              />
              <div className="space-y-1">
                <label className="block text-xs font-medium text-foreground">
                  Key Secret <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRazorpaySecret ? "text" : "password"}
                    value={razorpayKeySecret}
                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                    placeholder={cafe.razorpayKeyId ? "Enter new key secret to update" : "Paste key secret from Razorpay dashboard"}
                    className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRazorpaySecret((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {showRazorpaySecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {cafe.razorpayKeyId && (
                  <p className="text-xs text-muted">Leave blank to keep the existing key secret.</p>
                )}
              </div>
              <Input
                id="razorpay-webhook-secret"
                label="Webhook Secret (optional)"
                value={razorpayWebhookSecret}
                onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                placeholder="Leave blank to keep existing / use global default"
              />
            </>
          )}

          {paymentError && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-xl border border-danger/25">{paymentError}</div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={paymentSaving} onClick={handlePaymentSave}>
              <CreditCard size={14} className="mr-1" />
              Save Credentials
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate / Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
        title={cafe._count.orders > 0 ? "Deactivate Cafe" : "Permanently Delete Cafe"}
      >
        <div className="space-y-4">
          {cafe._count.orders > 0 ? (
            <>
              <p className="text-sm text-muted">
                You are about to deactivate <strong className="text-foreground">{cafe.name}</strong>.
                The cafe will be hidden from customers but all order history will be preserved.
              </p>
              <div className="bg-warning/10 border border-warning/25 rounded-xl p-3 text-sm text-warning">
                <strong>{cafe._count.orders} orders</strong> will be retained. This action can be reversed by reactivating the cafe.
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>
                  Deactivate Cafe
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                You are about to <strong className="text-foreground">permanently delete</strong> {cafe.name}. This will remove all menus, categories, staff and data. <strong className="text-danger">This cannot be undone.</strong>
              </p>
              <div className="bg-danger/10 border border-danger/25 rounded-xl p-3 text-sm text-danger">
                To confirm, type the cafe name exactly: <strong>{cafe.name}</strong>
              </div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Type "${cafe.name}" to confirm`}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger"
              />
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}>Cancel</Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  loading={deleting}
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== cafe.name}
                >
                  <Trash2 size={14} className="mr-1" />
                  Permanently Delete
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
