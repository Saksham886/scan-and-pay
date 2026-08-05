"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Modal } from "@/frontend/components/ui/modal";
import { Badge } from "@/frontend/components/ui/badge";
import { EmptyState } from "@/frontend/components/ui/empty-state";
import { paiseToCurrencyShort } from "@/shared/utils/currency";
import {
  Store,
  Plus,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Activity,
  Trash2,
  ChevronRight,
  QrCode,
  Users,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react";
import { CafeQRModal } from "@/frontend/components/admin/cafe-qr-modal";

interface StaffMember {
  id: string;
  cafeId: string;
  name: string;
  age: number;
  mobileNumber: string;
}

interface CafeWithStats {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  _count: { orders: number; menuItems: number; users: number; staff: number };
}

export default function AdminCafesPage() {
  const router = useRouter();
  const [cafes, setCafes] = useState<CafeWithStats[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalRevenue: number;
    totalOrders: number;
    activeCafes: number;
    todayRevenue: number;
    todayOrders: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const slugify = (raw: string) =>
    raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Auto-suggest the URL slug from the cafe name until the admin edits it directly.
  const handleNameChange = (value: string) => {
    setFormName(value);
    if (!slugTouched) setFormSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    // Lowercase + strip disallowed characters as they type, but don't trim
    // trailing hyphens live — that would make it impossible to type one.
    setFormSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  // Staff state
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [staffCafeFilter, setStaffCafeFilter] = useState<string>("ALL");
  const [staffLoading, setStaffLoading] = useState(true);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<CafeWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // QR state (accepts any cafe-shaped object with name+slug)
  const [qrTarget, setQrTarget] = useState<{ name: string; slug: string } | null>(null);

  const fetchAllStaff = useCallback(async (cafeList: CafeWithStats[]) => {
    try {
      const results = await Promise.all(
        cafeList.map((c) =>
          fetch(`/api/admin/cafes/${c.id}/staff`)
            .then((r) => r.json())
            .then((d) => (d.success ? (d.data as StaffMember[]).map((s) => ({ ...s, cafeId: c.id })) : []))
            .catch(() => [] as StaffMember[])
        )
      );
      setAllStaff(results.flat());
    } finally {
      setStaffLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [cafesRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/cafes", { cache: "no-store" }),
        fetch("/api/admin/analytics", { cache: "no-store" }),
      ]);
      const cafesData = await cafesRes.json();
      const analyticsData = await analyticsRes.json();

      if (cafesData.success) {
        setCafes(cafesData.data);
        fetchAllStaff(cafesData.data);
      }
      if (analyticsData.success) setAnalytics(analyticsData.data);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchAllStaff]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCafe = async () => {
    setFormError("");
    if (!formName) { setFormError("Cafe name is required"); return; }
    if (!formAddress.trim()) { setFormError("Address is required"); return; }
    if (!formPhone.trim()) { setFormError("Phone is required"); return; }
    if (!ownerName || !ownerEmail || !ownerPassword) { setFormError("Owner credentials are required"); return; }
    if (ownerPassword.length < 6) { setFormError("Password must be at least 6 characters"); return; }
    const cleanSlug = slugify(formSlug);
    if (!cleanSlug) {
      setFormError("Cafe URL is required (letters, numbers, and hyphens only)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/cafes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          address: formAddress.trim(),
          phone: formPhone.trim(),
          slug: cleanSlug,
          ownerName,
          ownerEmail: ownerEmail.trim().toLowerCase(),
          ownerPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setFormName("");
        setFormAddress("");
        setFormPhone("");
        setFormSlug("");
        setSlugTouched(false);
        setOwnerName("");
        setOwnerEmail("");
        setOwnerPassword("");
        setShowOwnerPassword(false);
        setFormError("");
        fetchData();
        // Auto-open QR for the newly created cafe
        if (data.data?.name && data.data?.slug) {
          setQrTarget({ name: data.data.name, slug: data.data.slug });
        }
      } else {
        setFormError(data.error || "Failed to create cafe");
      }
    } catch (err) {
      console.error("Failed to create cafe:", err);
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCafe = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/cafes/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete cafe:", err);
    } finally {
      setDeleting(false);
    }
  };

  const statCards = analytics
    ? [
        {
          label: "Total Revenue",
          value: paiseToCurrencyShort(analytics.totalRevenue),
          icon: <DollarSign size={18} />,
          iconBg: "bg-success/20 text-success",
          accent: "from-stone-400 to-stone-600",
        },
        {
          label: "Today's Revenue",
          value: paiseToCurrencyShort(analytics.todayRevenue),
          icon: <TrendingUp size={18} />,
          iconBg: "bg-warning/20 text-warning",
          accent: "from-amber-600 to-amber-800",
        },
        {
          label: "Total Orders",
          value: String(analytics.totalOrders),
          icon: <ShoppingBag size={18} />,
          iconBg: "bg-info/20 text-info",
          accent: "from-stone-500 to-stone-700",
        },
        {
          label: "Today's Orders",
          value: String(analytics.todayOrders),
          icon: <Activity size={18} />,
          iconBg: "bg-primary/20 text-primary",
          accent: "from-stone-300 to-stone-500",
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-5 animate-pulse h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-5 animate-pulse h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">Welcome back. Here&apos;s what&apos;s happening</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="self-start sm:self-auto">
          <Plus size={16} className="mr-1.5" />
          Add Cafe
        </Button>
      </div>

      {/* Stat Cards */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="relative bg-surface rounded-2xl border border-border p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-150">
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${stat.accent}`} />
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.iconBg}`}>
                {stat.icon}
              </div>
              <p className="text-[11px] text-muted font-medium uppercase tracking-wide mb-0.5">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cafes */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">
          All Cafes
          <span className="ml-2 text-xs font-normal text-muted bg-surface-hover px-2 py-0.5 rounded-full border border-border">{cafes.length}</span>
        </h2>
      </div>

      {cafes.length === 0 ? (
        <EmptyState
          icon={<Store size={48} />}
          title="No cafes yet"
          description="Create your first cafe to get started"
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus size={18} className="mr-1.5" />
              Add Cafe
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cafes.map((cafe) => (
            <div
              key={cafe.id}
              onClick={() => router.push(`/admin/cafes/${cafe.id}`)}
              className="bg-surface rounded-2xl border border-border p-5 shadow-sm hover:shadow-lg hover:border-primary/20 transition-shadow duration-150 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Store size={17} className="text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={cafe.isActive ? "success" : "danger"}>
                    {cafe.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <ChevronRight size={15} className="text-muted/50" />
                </div>
              </div>

              <p className="font-semibold text-base mb-0.5">{cafe.name}</p>
              <p className="text-xs text-muted/60 mb-3">/{cafe.slug}</p>
              {cafe.address && (
                <p className="text-xs text-muted mb-3 truncate">{cafe.address}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex gap-3 text-xs">
                  <span className="text-muted"><strong className="text-foreground font-semibold">{cafe._count.orders}</strong> orders</span>
                  <span className="text-muted"><strong className="text-foreground font-semibold">{cafe._count.menuItems}</strong> items</span>
                  <span className="text-muted"><strong className="text-foreground font-semibold">{cafe._count.staff}</strong> staff</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setQrTarget(cafe); }}
                    className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Show QR code"
                  >
                    <QrCode size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(cafe); }}
                    className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    title={cafe._count.orders > 0 ? "Deactivate cafe" : "Delete cafe"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Cafe Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setFormError(""); }} title="Add New Cafe">
        <div className="space-y-4">
          <p className="text-xs text-muted font-medium uppercase tracking-wide">Cafe Details</p>
          <Input
            id="cafe-name"
            label="Cafe Name"
            value={formName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Downtown Brew"
            required
          />
          <div>
            <Input
              id="cafe-slug"
              label="Cafe URL"
              value={formSlug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g. downtown-brew"
              required
            />
            <p className="mt-1.5 text-xs text-muted">
              Customer link:{" "}
              <code className="font-mono bg-surface-hover px-1.5 py-0.5 rounded">
                /{formSlug || "…"}
              </code>
            </p>
          </div>
          <Input
            id="cafe-address"
            label="Address"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
            placeholder="e.g. 123 Main Street"
            required
          />
          <Input
            id="cafe-phone"
            label="Phone"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            placeholder="e.g. +91 98765 43210"
            required
          />

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">Owner Credentials</p>
            <div className="space-y-3">
              <Input
                id="owner-name"
                label="Owner Name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Full name"
                required
              />
              <Input
                id="owner-email"
                label="Owner Email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@example.com"
                type="email"
                required
              />
              <div className="w-full">
                <label htmlFor="owner-password" className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                  Owner Password
                </label>
                <div className="relative">
                  <input
                    id="owner-password"
                    type={showOwnerPassword ? "text" : "password"}
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-foreground text-sm placeholder:text-muted/60 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnerPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showOwnerPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {formError && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-xl border border-danger/25">
              {formError}
            </div>
          )}

          <Button onClick={handleCreateCafe} className="w-full" loading={saving}>
            Create Cafe & Owner
          </Button>
        </div>
      </Modal>

      {/* All Staff Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={18} className="text-primary" />
            All Staff
          </h2>
        </div>

        {/* Cafe filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setStaffCafeFilter("ALL")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${staffCafeFilter === "ALL" ? "bg-primary text-white border-primary" : "bg-surface text-muted border-border hover:border-primary/30"}`}
          >
            All Branches
          </button>
          {cafes.map((c) => (
            <button
              key={c.id}
              onClick={() => setStaffCafeFilter(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${staffCafeFilter === c.id ? "bg-primary text-white border-primary" : "bg-surface text-muted border-border hover:border-primary/30"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {staffLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl border border-border p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : (() => {
          const filtered = staffCafeFilter === "ALL" ? allStaff : allStaff.filter((s) => s.cafeId === staffCafeFilter);
          return filtered.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-border p-8 text-center text-muted text-sm">
              No staff members found
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-border overflow-hidden">
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-border">
                {filtered.map((member) => {
                  const cafe = cafes.find((c) => c.id === member.cafeId);
                  return (
                    <div key={member.id} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{member.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted mt-0.5">{cafe?.name ?? "-"} · Age {member.age} · {member.mobileNumber}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <div className="grid grid-cols-4 gap-3 px-4 py-3 bg-background border-b border-border text-xs font-medium text-muted">
                  <span>Name</span>
                  <span>Branch</span>
                  <span>Age</span>
                  <span className="flex items-center gap-1"><Phone size={10} /> Mobile</span>
                </div>
                {filtered.map((member, i) => {
                  const cafe = cafes.find((c) => c.id === member.cafeId);
                  return (
                    <div key={member.id} className={`grid grid-cols-4 gap-3 px-4 py-3 text-sm items-center ${i < filtered.length - 1 ? "border-b border-border" : ""}`}>
                      <span className="font-medium truncate">{member.name}</span>
                      <span className="text-muted truncate">{cafe?.name ?? "-"}</span>
                      <span className="text-muted">{member.age}</span>
                      <span className="text-muted text-xs">{member.mobileNumber}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* QR Code Modal */}
      <CafeQRModal
        isOpen={!!qrTarget}
        onClose={() => setQrTarget(null)}
        cafeName={qrTarget?.name || ""}
        cafeSlug={qrTarget?.slug || ""}
      />

      {/* Deactivate / Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
        title={(deleteTarget?._count.orders ?? 0) > 0 ? "Deactivate Cafe" : "Permanently Delete Cafe"}
      >
        {deleteTarget && (
          <div className="space-y-4">
            {deleteTarget._count.orders > 0 ? (
              <>
                <p className="text-sm text-muted">
                  You are about to deactivate <strong className="text-foreground">{deleteTarget.name}</strong>.
                  The cafe will be hidden from customers but all order history will be preserved.
                </p>
                <div className="bg-warning/10 border border-warning/25 rounded-xl p-3 text-sm text-warning">
                  <strong>{deleteTarget._count.orders} orders</strong> will be retained. This action can be reversed by reactivating the cafe.
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                  <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDeleteCafe}>
                    Deactivate Cafe
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  You are about to <strong className="text-foreground">permanently delete</strong> {deleteTarget.name}. This will remove all menus, categories, staff and data. <strong className="text-danger">This cannot be undone.</strong>
                </p>
                <div className="bg-danger/10 border border-danger/25 rounded-xl p-3 text-sm text-danger">
                  To confirm, type the cafe name exactly: <strong>{deleteTarget.name}</strong>
                </div>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`Type "${deleteTarget.name}" to confirm`}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger"
                />
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}>Cancel</Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    loading={deleting}
                    onClick={handleDeleteCafe}
                    disabled={deleteConfirmText !== deleteTarget.name}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Permanently Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
