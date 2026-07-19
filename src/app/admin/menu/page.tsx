"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Modal } from "@/frontend/components/ui/modal";
import { ConfirmDialog } from "@/frontend/components/ui/confirm-dialog";
import { Badge } from "@/frontend/components/ui/badge";
import { EmptyState } from "@/frontend/components/ui/empty-state";
import { paiseToCurrencyShort, rupeesToPaise } from "@/shared/utils/currency";
import { cn } from "@/shared/utils/cn";
import {
  Plus, UtensilsCrossed, Pencil, Trash2,
  Eye, EyeOff, Globe, Store, ImagePlus, X, ChevronDown, Tag,
} from "lucide-react";

interface Cafe {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count: { menuItems: number };
}

interface MenuItem {
  id: string;
  cafeId: string | null;
  name: string;
  description: string | null;
  pricePaise: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
  cafe?: { id: string; name: string; slug: string } | null;
}

const GLOBAL = "__global__";
const ALL = "__all__";

function VegDot({ isVeg }: { isVeg: boolean }) {
  return (
    <span className={cn("inline-flex w-3.5 h-3.5 rounded-sm border-2 items-center justify-center flex-shrink-0",
      isVeg ? "border-green-600" : "border-red-500")}>
      <span className={cn("block w-1.5 h-1.5 rounded-full", isVeg ? "bg-green-600" : "bg-red-500")} />
    </span>
  );
}

export default function AdminMenuPage() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cafeFilter, setCafeFilter] = useState<string>(ALL); // ALL | GLOBAL | cafeId

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formCafeId, setFormCafeId] = useState<string>(GLOBAL); // GLOBAL or actual cafeId
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [formSaving, setFormSaving] = useState(false);

  // Categories for the selected café in the modal
  const [modalCategories, setModalCategories] = useState<{ id: string; name: string }[]>([]);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; message: string; onConfirm: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  // Fetch cafes once
  useEffect(() => {
    fetch("/api/admin/cafes")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCafes(d.data); })
      .catch(console.error);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/admin/menu";
      if (cafeFilter === GLOBAL) url += "?cafeId=null";
      else if (cafeFilter !== ALL) url += `?cafeId=${encodeURIComponent(cafeFilter)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    } finally {
      setLoading(false);
    }
  }, [cafeFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Categories management
  const [allCategories, setAllCategories] = useState<{ id: string; name: string; cafeId: string | null; cafe?: { name: string } | null }[]>([]);

  const fetchAllCategories = useCallback(async () => {
    const r = await fetch("/api/admin/categories");
    const d = await r.json();
    if (d.success) setAllCategories(d.data);
  }, []);

  useEffect(() => { fetchAllCategories(); }, [fetchAllCategories]);

  const deleteCategory = (cat: { id: string; name: string }) => {
    setConfirmDialog({
      open: true,
      message: `Delete category "${cat.name}"? Items in this category will become uncategorized.`,
      onConfirm: async () => {
        await fetch(`/api/admin/categories?id=${cat.id}`, { method: "DELETE" });
        fetchAllCategories();
        loadModalCategories();
      },
    });
  };

  // Inline "create new category" state (used inside the item modal)
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  const loadModalCategories = useCallback(async () => {
    // Always load all categories (cafe-specific + global) so the admin can use any
    try {
      const r = await fetch("/api/admin/categories");
      const d = await r.json();
      if (d.success) setModalCategories(d.data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }, []);

  // Load all categories when the modal opens
  useEffect(() => {
    if (!showModal) { setModalCategories([]); return; }
    loadModalCategories();
  }, [showModal, loadModalCategories]);

  const handleInlineCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const body = formCafeId === GLOBAL
        ? { name: newCatName.trim(), cafeId: null }
        : { name: newCatName.trim(), cafeId: formCafeId };
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to create category");
        return;
      }
      await loadModalCategories();
      setFormCategoryId(data.data.id);
      setNewCatName("");
      setShowNewCat(false);
    } catch (err) {
      console.error("Create category error:", err);
      alert("Network error creating category");
    } finally {
      setCreatingCat(false);
    }
  };

  // Resolve which cafeId to preset when opening Add modal
  function resolvePresetCafe(hint: string): string {
    if (hint !== ALL && hint !== GLOBAL) return hint; // specific café filter active
    return cafes[0]?.id ?? GLOBAL; // fall back to first café, or global if none loaded
  }

  function openAddModal(presetCafeId: string = GLOBAL) {
    setEditItem(null);
    setFormName(""); setFormDescription(""); setFormPrice("");
    setFormIsVeg(true); setFormImageUrl(null);
    setFormCategoryId("");
    setFormCafeId(presetCafeId);
    setShowNewCat(false); setNewCatName("");
    setShowModal(true);
  }

  function openEditModal(item: MenuItem) {
    setEditItem(item);
    setFormName(item.name);
    setFormDescription(item.description || "");
    setFormPrice(String(item.pricePaise / 100));
    setFormIsVeg(item.isVeg);
    setFormImageUrl(item.imageUrl);
    setFormCategoryId(item.categoryId ?? "");
    setFormCafeId(item.cafeId ?? GLOBAL);
    setShowNewCat(false); setNewCatName("");
    setShowModal(true);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) setFormImageUrl(data.data.imageUrl);
      else alert(data.error || "Upload failed");
    } catch { alert("Image upload failed"); }
    finally { setImageUploading(false); }
  };

  const handleSave = async () => {
    if (!formName || !formPrice) return;
    if (!formCategoryId) {
      alert("Please select a category (or create a new one).");
      return;
    }
    setFormSaving(true);

    const payload = {
      name: formName,
      description: formDescription || null,
      pricePaise: rupeesToPaise(parseFloat(formPrice)),
      isVeg: formIsVeg,
      imageUrl: formImageUrl || null,
      cafeId: formCafeId === GLOBAL ? null : formCafeId,
      categoryId: formCategoryId,
    };

    try {
      const res = editItem
        ? await fetch(`/api/admin/menu/${editItem.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/menu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save item. Make sure the DB migration has been run.");
        return;
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      console.error("Failed to save:", err);
      alert("Network error - could not save item.");
    } finally { setFormSaving(false); }
  };

  const toggleAvailability = async (item: MenuItem) => {
    await fetch(`/api/admin/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    fetchItems();
  };

  const deleteItem = (item: MenuItem) => {
    setConfirmDialog({
      open: true,
      message: `"${item.name}" will be permanently deleted.`,
      onConfirm: async () => {
        await fetch(`/api/admin/menu/${item.id}`, { method: "DELETE" });
        fetchItems();
      },
    });
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-muted mt-0.5">
            {items.length} item{items.length !== 1 ? "s" : ""} shown
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openAddModal(GLOBAL)}
          >
            <Globe size={14} className="mr-1.5" />
            Add Global Item
          </Button>
          <Button
            size="sm"
            onClick={() => openAddModal(resolvePresetCafe(cafeFilter))}
          >
            <Plus size={14} className="mr-1.5" />
            Add Item
          </Button>
        </div>
      </div>

      {/* ── Filter dropdown ── */}
      <div className="flex items-center gap-2 mb-5">
        <label htmlFor="menu-cafe-filter" className="text-xs font-medium text-muted">
          Filter by café:
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {cafeFilter === ALL ? (
              <UtensilsCrossed size={13} />
            ) : cafeFilter === GLOBAL ? (
              <Globe size={13} />
            ) : (
              <Store size={13} />
            )}
          </span>
          <select
            id="menu-cafe-filter"
            value={cafeFilter}
            onChange={(e) => setCafeFilter(e.target.value)}
            className="appearance-none bg-surface border border-border rounded-xl pl-8 pr-9 py-2 text-sm font-medium text-foreground hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary transition-colors cursor-pointer min-w-[200px]"
          >
            <option value={ALL}>All Cafés</option>
            <option value={GLOBAL}>Global (all cafés)</option>
            {cafes.length > 0 && (
              <optgroup label="Cafés">
                {cafes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c._count?.menuItems !== undefined ? ` - ${c._count.menuItems} items` : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={48} />}
          title="No items found"
          description={
            cafeFilter === GLOBAL
              ? "No global items yet. Add one to have it appear across all cafés."
              : cafeFilter !== ALL
              ? "This café has no items yet."
              : "No menu items exist yet."
          }
          action={
            <Button onClick={() => openAddModal(cafeFilter !== ALL && cafeFilter !== GLOBAL ? cafeFilter : GLOBAL)}>
              <Plus size={16} className="mr-1.5" />
              {cafeFilter === GLOBAL || cafeFilter === ALL ? "Add Global Item" : "Add Item"}
            </Button>
          }
        />
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs">
                <th className="text-left px-4 py-3 font-medium">Item</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Price</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium">Café</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={cn("hover:bg-surface-hover transition-colors", !item.isAvailable && "opacity-60")}
                >
                  {/* Name + image */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} width={36} height={36} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed size={14} className="text-muted" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <VegDot isVeg={item.isVeg} />
                          <span className="font-medium text-foreground">{item.name}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted line-clamp-1 mt-0.5 max-w-[180px]">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 hidden md:table-cell font-semibold text-primary">
                    {paiseToCurrencyShort(item.pricePaise)}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 hidden lg:table-cell text-muted">
                    {item.category?.name ?? <span className="italic opacity-50">None</span>}
                  </td>

                  {/* Café badge */}
                  <td className="px-4 py-3">
                    {item.cafeId === null ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        <Globe size={10} />
                        Global
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-hover text-muted border border-border">
                        <Store size={10} />
                        {item.cafe?.name ?? "-"}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant={item.isAvailable ? "success" : "danger"}>
                      {item.isAvailable ? "Available" : "Hidden"}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => toggleAvailability(item)}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
                        title={item.isAvailable ? "Hide item" : "Show item"}
                      >
                        {item.isAvailable ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-danger/70 hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Categories ── */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Tag size={16} className="text-muted" />
          <h2 className="text-lg font-semibold">Categories</h2>
          <span className="text-sm text-muted">({allCategories.length})</span>
        </div>
        {allCategories.length === 0 ? (
          <p className="text-sm text-muted">No categories yet.</p>
        ) : (
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Scope</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 font-medium">{cat.name}</td>
                    <td className="px-4 py-3">
                      {cat.cafeId === null ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          <Globe size={10} /> Global
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-hover text-muted border border-border">
                          <Store size={10} /> {cat.cafe?.name ?? "Café"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => deleteCategory(cat)}
                          className="p-1.5 rounded-lg hover:bg-surface-hover text-danger/70 hover:text-danger transition-colors"
                          title="Delete category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Edit Item" : "Add Menu Item"}
      >
        <div className="space-y-4">
          {/* Café selector */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Café <span className="text-muted font-normal">(leave as Global to show in all cafés)</span>
            </label>
            <div className="relative">
              <select
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                value={formCafeId}
                onChange={(e) => { setFormCafeId(e.target.value); setFormCategoryId(""); }}
              >
                <option value={GLOBAL}>🌐 Global - appears in all cafes</option>
                {cafes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>

          {/* Category selector (always required) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">
                Category <span className="text-danger">*</span>
              </label>
              <button
                type="button"
                onClick={() => { setShowNewCat((v) => !v); setNewCatName(""); }}
                className="text-xs font-medium text-primary hover:underline"
              >
                {showNewCat ? "Cancel" : "+ New category"}
              </button>
            </div>

            {showNewCat ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder={formCafeId === GLOBAL ? "New global category name" : "New category name"}
                  className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  type="button"
                  onClick={handleInlineCreateCategory}
                  loading={creatingCat}
                  disabled={!newCatName.trim()}
                >
                  Add
                </Button>
              </div>
            ) : (
              <div className="relative">
                <select
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a category…</option>
                  {modalCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            )}

            {!showNewCat && modalCategories.length === 0 && (
              <p className="text-xs text-muted mt-1.5">
                No categories yet. Use &quot;+ New category&quot; to create one.
              </p>
            )}
          </div>

          <Input
            id="item-name"
            label="Item Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Masala Chai"
            required
          />
          <Input
            id="item-desc"
            label="Description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Optional description"
          />
          <Input
            id="item-price"
            label="Price (₹)"
            type="number"
            step="0.01"
            min="0"
            value={formPrice}
            onChange={(e) => setFormPrice(e.target.value)}
            placeholder="e.g. 149"
            required
          />

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Image</label>
            {formImageUrl ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border">
                <Image src={formImageUrl} alt="Preview" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setFormImageUrl(null)}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className={cn(
                "flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5",
                imageUploading && "opacity-50 pointer-events-none"
              )}>
                <ImagePlus size={24} className="text-muted mb-1" />
                <span className="text-sm text-muted">{imageUploading ? "Uploading…" : "Click to upload"}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          {/* Veg / Non-veg */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Type:</label>
            <button
              type="button"
              onClick={() => setFormIsVeg(true)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                formIsVeg ? "bg-success/15 border-success/50 text-success" : "border-border text-muted"
              )}
            >
              Veg
            </button>
            <button
              type="button"
              onClick={() => setFormIsVeg(false)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                !formIsVeg ? "bg-danger/15 border-danger/50 text-danger" : "border-border text-muted"
              )}
            >
              Non-Veg
            </button>
          </div>

          <Button onClick={handleSave} className="w-full" loading={formSaving}>
            {editItem ? "Update Item" : formCafeId === GLOBAL ? "Add Global Item" : "Add Item"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title="Delete Item"
        message={confirmDialog.message}
      />
    </div>
  );
}
