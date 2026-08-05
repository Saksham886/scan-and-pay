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
  Trash2,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  TrendingUp,
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
  Receipt,
  Shield,
  Wallet,
} from "lucide-react";
import { CafeQRModal } from "@/frontend/components/admin/cafe-qr-modal";
import type { UserRole } from "@/generated/prisma";

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

interface CafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

interface ExpenseItem {
  id: string;
  title: string;
  description: string | null;
  amountPaise: number;
  category: string;
  date: string;
  createdAt: string;
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
  _count: { orders: number; menuItems: number; users: number; staff: number };
  users: CafeOwner[];
}

export default function AdminCafeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [cafe, setCafe] = useState<CafeDetail | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [webhookCopied, setWebhookCopied] = useState(false);
  // Admin panel is served from the same origin as the backend, so this is the
  // exact webhook URL the super admin must register in each cafe's Razorpay
  // dashboard. Empty during SSR (window undefined); the modal only renders
  // client-side once the cafe has loaded, so it's always populated when shown.
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/razorpay`
      : "";
  const [switchingProvider, setSwitchingProvider] = useState(false);

  // Cafe users state
  const [cafeUsers, setCafeUsers] = useState<CafeUser[]>([]);
  const [cafeUsersLoading, setCafeUsersLoading] = useState(true);

  // Expenses state
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expenseRange, setExpenseRange] = useState<string>("month");

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

  const fetchCafeUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/cafes/${id}/users`);
      const data = await res.json();
      if (data.success) setCafeUsers(data.data);
    } catch {
      console.error("Failed to fetch cafe users");
    } finally {
      setCafeUsersLoading(false);
    }
  }, [id]);

  const fetchExpenses = useCallback(async (r: string) => {
    setExpensesLoading(true);
    try {
      const res = await fetch(`/api/admin/cafes/${id}/expenses?range=${r}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data.expenses);
        setExpensesTotal(data.data.totalPaise);
      }
    } catch {
      console.error("Failed to fetch expenses");
    } finally {
      setExpensesLoading(false);
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

  useEffect(() => {
    fetchCafe();
    fetchStaff();
    fetchCafeUsers();
  }, [fetchCafe, fetchStaff, fetchCafeUsers]);

  useEffect(() => {
    fetchExpenses(expenseRange);
  }, [fetchExpenses, expenseRange]);

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
            <Button size="sm" variant="secondary" onClick={() => router.push(`/admin/cafes/${id}/revenue`)}>
              <TrendingUp size={14} className="mr-1" />
              Revenue
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
            <p className="text-2xl font-bold">{cafe._count.staff}</p>
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

      {/* Cafe User Accounts Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            Accounts ({cafeUsers.length})
          </h2>
        </div>

        {cafeUsersLoading ? (
          <div className="bg-surface rounded-2xl border border-border p-5 animate-pulse h-20" />
        ) : cafeUsers.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border p-8 text-center text-muted text-sm">
            No user accounts for this cafe
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <div className="hidden sm:block">
              <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-background border-b border-border text-xs font-medium text-muted">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span className="text-right">Created</span>
              </div>
              {cafeUsers.map((user, i) => (
                <div
                  key={user.id}
                  className={cn(
                    "grid grid-cols-5 gap-4 px-5 py-3 text-sm items-center",
                    i < cafeUsers.length - 1 && "border-b border-border"
                  )}
                >
                  <span className="font-medium">{user.name}</span>
                  <span className="text-muted truncate text-xs">{user.email}</span>
                  <span>
                    <Badge variant={user.role === "CAFE_OWNER" ? "info" : "default"}>
                      {user.role.replace("_", " ")}
                    </Badge>
                  </span>
                  <span>
                    <Badge variant={user.isActive ? "success" : "danger"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </span>
                  <span className="text-right text-muted text-xs">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
            <div className="sm:hidden divide-y divide-border">
              {cafeUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{user.name}</p>
                      <Badge variant={user.role === "CAFE_OWNER" ? "info" : "default"}>
                        {user.role.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{user.email}</p>
                  </div>
                  <Badge variant={user.isActive ? "success" : "danger"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wallet size={18} className="text-primary" />
            Expenses {expensesTotal > 0 && <span className="text-sm font-normal text-muted">({paiseToCurrencyShort(expensesTotal)} total)</span>}
          </h2>
          <div className="flex items-center gap-1 bg-surface rounded-xl border border-border p-1 overflow-x-auto">
            {(["today", "week", "month", "year", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setExpenseRange(r)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  expenseRange === r ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                )}
              >
                {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {expensesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl border border-border p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border p-8 text-center text-muted text-sm">
            No expenses in this period
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="bg-surface rounded-2xl border border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-danger/10 flex items-center justify-center flex-shrink-0">
                    <Receipt size={16} className="text-danger" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{expense.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-hover text-muted">{expense.category}</span>
                      {expense.description && (
                        <span className="text-xs text-muted truncate">{expense.description}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-semibold text-sm text-danger">{paiseToCurrencyShort(expense.amountPaise)}</p>
                  <p className="text-xs text-muted">
                    {new Date(expense.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
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
              <div className="space-y-2">
                <label
                  className="block text-xs font-medium text-foreground"
                  htmlFor="razorpay-webhook-secret"
                >
                  Webhook Secret <span className="text-muted">(recommended)</span>
                </label>
                <div className="bg-warning/10 border border-warning/25 rounded-xl p-3 text-xs text-foreground/90 space-y-2">
                  <p>
                    In this cafe&apos;s Razorpay dashboard, go to{" "}
                    <strong>Settings &gt; Webhooks &gt; Add New Webhook</strong> and use this URL:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded-lg bg-background border border-border px-2 py-1 font-mono text-[11px]">
                      {webhookUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(webhookUrl);
                        setWebhookCopied(true);
                        setTimeout(() => setWebhookCopied(false), 1500);
                      }}
                      className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground"
                    >
                      {webhookCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p>
                    Enable events <span className="font-mono">qr_code.credited</span>,{" "}
                    <span className="font-mono">payment.captured</span>,{" "}
                    <span className="font-mono">order.paid</span> — then paste the webhook&apos;s
                    signing secret below. <strong>It must match</strong> the secret you set there,
                    or this cafe&apos;s payment confirmations get rejected.
                  </p>
                </div>
                <input
                  id="razorpay-webhook-secret"
                  type="text"
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  placeholder={
                    cafe.razorpayKeyId
                      ? "Enter new webhook secret to update"
                      : "Paste the webhook signing secret"
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                />
                {cafe.razorpayKeyId && (
                  <p className="text-xs text-muted">
                    Leave blank to keep the existing webhook secret.
                  </p>
                )}
              </div>
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
