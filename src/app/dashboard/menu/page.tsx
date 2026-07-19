"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Card } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Modal } from "@/frontend/components/ui/modal";
import { ConfirmDialog } from "@/frontend/components/ui/confirm-dialog";
import { Badge } from "@/frontend/components/ui/badge";
import { EmptyState } from "@/frontend/components/ui/empty-state";
import { paiseToCurrencyShort, rupeesToPaise } from "@/shared/utils/currency";
import {
  Plus,
  UtensilsCrossed,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Store,
  ExternalLink,
  Tag,
  FolderPlus,
  ImagePlus,
  X,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  categoryId: string | null;
  category?: { name: string } | null;
}

interface MenuCategory {
  id: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

interface CafeOption {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export default function MenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);

  // Admin cafe picker state
  const [cafes, setCafes] = useState<CafeOption[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Item form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formSaving, setFormSaving] = useState(false);

  // Category management state
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<MenuCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  // Image upload state
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [formError, setFormError] = useState("");

  // Inline "new category" from item modal
  const [inlineNewCat, setInlineNewCat] = useState("");
  const [inlineCatSaving, setInlineCatSaving] = useState(false);

  // Active tab: "items" or "categories"
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  const getMenuApiBase = useCallback(() => {
    if (isAdmin && selectedCafeId) return `/api/admin/cafes/${selectedCafeId}/menu`;
    return "/api/dashboard/menu";
  }, [isAdmin, selectedCafeId]);

  const getCatApiBase = useCallback(() => {
    if (isAdmin && selectedCafeId) return `/api/admin/cafes/${selectedCafeId}/categories`;
    return "/api/dashboard/menu/categories";
  }, [isAdmin, selectedCafeId]);

  // Init: detect if admin
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/admin/cafes");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data.length > 0) {
            setIsAdmin(true);
            setCafes(data.data);
            setSelectedCafeId(data.data[0].id);
            return;
          }
        }
      } catch {
        // Not admin
      }
      setIsAdmin(false);
      fetchMenuForOwner();
    };
    init();
  }, []);

  useEffect(() => {
    if (isAdmin && selectedCafeId) {
      fetchMenuForCafe(selectedCafeId);
    }
  }, [isAdmin, selectedCafeId]);

  const fetchMenuForOwner = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/menu");
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items);
        setCategories(data.data.categories);
      }
    } catch (err) {
      console.error("Failed to fetch menu:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuForCafe = async (cafeId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cafes/${cafeId}/menu`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items);
        setCategories(data.data.categories);
      }
    } catch (err) {
      console.error("Failed to fetch cafe menu:", err);
    } finally {
      setLoading(false);
    }
  };

  const refetchMenu = () => {
    if (isAdmin && selectedCafeId) fetchMenuForCafe(selectedCafeId);
    else fetchMenuForOwner();
  };

  // ── Item CRUD ──────────────────────────────────────────

  const openAddModal = () => {
    setEditItem(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormCategory("");
    setFormIsVeg(true);
    setFormImageUrl(null);
    setInlineNewCat("");
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormDescription(item.description || "");
    setFormPrice(String(item.pricePaise / 100));
    setFormCategory(item.categoryId || "");
    setFormIsVeg(item.isVeg);
    setFormImageUrl(item.imageUrl);
    setInlineNewCat("");
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setFormImageUrl(data.data.imageUrl);
      } else {
        setFormError(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      setFormError("Image upload failed");
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!formName || !formPrice) return;
    if (!formCategory) {
      setFormError("Please select a category (or create a new one).");
      return;
    }
    setFormError("");
    setFormSaving(true);

    const apiBase = getMenuApiBase();
    const payload = {
      name: formName,
      description: formDescription || null,
      pricePaise: rupeesToPaise(parseFloat(formPrice)),
      categoryId: formCategory,
      isVeg: formIsVeg,
      imageUrl: formImageUrl || null,
    };

    try {
      const res = editItem
        ? await fetch(
            isAdmin && selectedCafeId
              ? `/api/admin/cafes/${selectedCafeId}/menu/${editItem.id}`
              : `/api/dashboard/menu/${editItem.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          )
        : await fetch(apiBase, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || "Failed to save item.");
        return;
      }
      setShowModal(false);
      refetchMenu();
    } catch (err) {
      console.error("Failed to save:", err);
      setFormError("Network error — could not save item.");
    } finally {
      setFormSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    const url = isAdmin && selectedCafeId
      ? `/api/admin/cafes/${selectedCafeId}/menu/${item.id}`
      : `/api/dashboard/menu/${item.id}`;
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    refetchMenu();
  };

  const deleteItem = (id: string) => {
    setConfirmDialog({
      open: true,
      message: "This menu item will be permanently deleted.",
      onConfirm: async () => {
        const url = isAdmin && selectedCafeId
          ? `/api/admin/cafes/${selectedCafeId}/menu/${id}`
          : `/api/dashboard/menu/${id}`;
        await fetch(url, { method: "DELETE" });
        refetchMenu();
      },
    });
  };

  // ── Category CRUD ──────────────────────────────────────

  const openAddCatModal = () => {
    setEditCat(null);
    setCatName("");
    setShowCatModal(true);
  };

  const openEditCatModal = (cat: MenuCategory) => {
    setEditCat(cat);
    setCatName(cat.name);
    setShowCatModal(true);
  };

  const handleSaveCat = async () => {
    if (!catName.trim()) return;
    setCatSaving(true);
    const base = getCatApiBase();

    try {
      if (editCat) {
        const url = isAdmin && selectedCafeId
          ? `/api/admin/cafes/${selectedCafeId}/categories/${editCat.id}`
          : base; // owner can only create, not edit - but we keep parity
        await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: catName.trim() }),
        });
      } else {
        await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: catName.trim() }),
        });
      }
      setShowCatModal(false);
      refetchMenu();
    } catch (err) {
      console.error("Failed to save category:", err);
    } finally {
      setCatSaving(false);
    }
  };

  const deleteCat = (catId: string) => {
    setConfirmDialog({
      open: true,
      message: "Delete this category? Items in it will become uncategorized.",
      onConfirm: async () => {
        const url = isAdmin && selectedCafeId
          ? `/api/admin/cafes/${selectedCafeId}/categories/${catId}`
          : `/api/dashboard/menu/categories/${catId}`;
        await fetch(url, { method: "DELETE" });
        refetchMenu();
      },
    });
  };

  // ── Inline create category from item modal ─────────────

  const handleInlineCreateCat = async () => {
    if (!inlineNewCat.trim()) return;
    setInlineCatSaving(true);
    const base = getCatApiBase();

    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inlineNewCat.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories((prev) => [...prev, data.data]);
        setFormCategory(data.data.id);
        setInlineNewCat("");
      }
    } catch (err) {
      console.error("Failed to create category:", err);
    } finally {
      setInlineCatSaving(false);
    }
  };

  const selectedCafe = cafes.find((c) => c.id === selectedCafeId);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Menu Management</h1>
          {isAdmin && selectedCafe && (
            <a
              href={`/${selectedCafe.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              <ExternalLink size={12} />
              Customer view
            </a>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {activeTab === "categories" ? (
            <Button size="sm" onClick={openAddCatModal}>
              <FolderPlus size={15} className="mr-1.5" />
              Add Category
            </Button>
          ) : (
            <Button size="sm" onClick={openAddModal}>
              <Plus size={15} className="mr-1.5" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Cafe Picker for Admin */}
      {isAdmin && cafes.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <Store size={16} className="text-muted flex-shrink-0" />
              <label className="text-sm font-medium whitespace-nowrap">Select Cafe:</label>
            </div>
            <select
              className="w-full sm:w-auto rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              value={selectedCafeId || ""}
              onChange={(e) => setSelectedCafeId(e.target.value)}
            >
              {cafes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {!c.isActive ? "(Inactive)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Tabs: Items / Categories */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("items")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-100",
            activeTab === "items"
              ? "bg-primary text-white shadow-sm"
              : "bg-surface text-muted border border-border hover:border-primary/30"
          )}
        >
          <UtensilsCrossed size={15} />
          Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-100",
            activeTab === "categories"
              ? "bg-primary text-white shadow-sm"
              : "bg-surface text-muted border border-border hover:border-primary/30"
          )}
        >
          <Tag size={15} />
          Categories ({categories.length})
        </button>
      </div>

      {/* ─── ITEMS TAB ─────────────────────────────────── */}
      {activeTab === "items" && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-surface rounded-2xl border border-border p-4 animate-pulse h-32" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed size={48} />}
              title="No menu items yet"
              description={isAdmin ? "Add the first menu item for this cafe" : "Add your first menu item to get started"}
              action={
                <Button onClick={openAddModal}>
                  <Plus size={18} className="mr-1.5" />
                  Add Item
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className={cn(!item.isAvailable && "opacity-60")}>
                  {item.imageUrl && (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden mb-3 -mt-1">
                      <Image src={item.imageUrl} alt={item.name} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-3.5 h-3.5 rounded-sm border-2",
                          item.isVeg ? "border-green-600" : "border-red-600"
                        )}
                      >
                        <span className={cn(
                          "block w-1.5 h-1.5 rounded-full m-auto mt-[2px]",
                          item.isVeg ? "bg-green-600" : "bg-red-600"
                        )} />
                      </span>
                      <h3 className="font-semibold">{item.name}</h3>
                    </div>
                    <Badge variant={item.isAvailable ? "success" : "danger"}>
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </div>

                  {item.description && (
                    <p className="text-sm text-muted mb-2 line-clamp-1">{item.description}</p>
                  )}

                  <p className="text-lg font-bold text-primary mb-3">
                    {paiseToCurrencyShort(item.pricePaise)}
                  </p>

                  {item.category && (
                    <p className="text-xs text-muted mb-3">
                      <Tag size={11} className="inline mr-1" />
                      {item.category.name}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => toggleAvailability(item)} className="flex-1">
                      {item.isAvailable ? <EyeOff size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
                      {item.isAvailable ? "Mark Unavailable" : "Mark Available"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(item)}>
                      <Pencil size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>
                      <Trash2 size={14} className="text-danger" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── CATEGORIES TAB ────────────────────────────── */}
      {activeTab === "categories" && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-surface rounded-xl border border-border p-4 animate-pulse h-14" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              icon={<Tag size={48} />}
              title="No categories yet"
              description="Categories help organize your menu items"
              action={
                <Button onClick={openAddCatModal}>
                  <FolderPlus size={18} className="mr-1.5" />
                  Add Category
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => {
                const itemCount = items.filter((i) => i.categoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="bg-surface rounded-xl border border-border px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Tag size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{cat.name}</p>
                        <p className="text-xs text-muted">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEditCatModal(cat)}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteCat(cat.id)}>
                        <Trash2 size={14} className="text-danger" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── ADD/EDIT ITEM MODAL ───────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Edit Menu Item" : "Add Menu Item"}
      >
        <div className="space-y-4">
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
            label="Price (in Rupees)"
            type="number"
            step="0.01"
            min="0"
            value={formPrice}
            onChange={(e) => setFormPrice(e.target.value)}
            placeholder="e.g. 149.50"
            required
          />

          {/* Category picker + inline create */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Category <span className="text-danger">*</span>
            </label>
            <select
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              required
            >
              <option value="" disabled>Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {/* Inline new category */}
            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted text-foreground"
                placeholder="New category name"
                value={inlineNewCat}
                onChange={(e) => setInlineNewCat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInlineCreateCat()}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInlineCreateCat}
                loading={inlineCatSaving}
                disabled={!inlineNewCat.trim()}
              >
                <FolderPlus size={14} className="mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Item Image</label>
            {formImageUrl ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border">
                <Image
                  src={formImageUrl}
                  alt="Preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFormImageUrl(null)}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className={cn(
                "flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed border-border cursor-pointer transition-colors",
                "hover:border-primary/50 hover:bg-primary/5",
                imageUploading && "opacity-50 pointer-events-none"
              )}>
                <ImagePlus size={28} className="text-muted mb-1.5" />
                <span className="text-sm text-muted">
                  {imageUploading ? "Uploading..." : "Click to upload image"}
                </span>
                <span className="text-xs text-muted/60 mt-0.5">JPEG, PNG, or WebP (max 5 MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}
          </div>

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

          {formError && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-xl border border-danger/25">
              {formError}
            </div>
          )}
          <Button onClick={handleSaveItem} className="w-full" loading={formSaving}>
            {editItem ? "Update Item" : "Add Item"}
          </Button>
        </div>
      </Modal>

      {/* ─── ADD/EDIT CATEGORY MODAL ───────────────────── */}
      <Modal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        title={editCat ? "Edit Category" : "Add Category"}
      >
        <div className="space-y-4">
          <Input
            id="cat-name"
            label="Category Name"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="e.g. Beverages, Snacks, Main Course"
            required
          />
          <Button onClick={handleSaveCat} className="w-full" loading={catSaving}>
            {editCat ? "Update Category" : "Create Category"}
          </Button>
        </div>
      </Modal>

      {/* ─── CONFIRM DIALOG ────────────────────────────── */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title="Delete"
        message={confirmDialog.message}
      />
    </div>
  );
}
