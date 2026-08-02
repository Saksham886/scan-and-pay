"use client";

import { useState } from "react";
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
  Tag,
  FolderPlus,
  ImagePlus,
  X,
  Globe,
  Gift,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";

export interface PanelMenuItem {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  categoryId: string | null;
  /** null = a shared/global item (not owned by this cafe). Editing one here
   *  creates a cafe-specific override rather than changing it everywhere. */
  cafeId?: string | null;
  /** Per-item subsidised flag — free for customers even if the menu itself
   *  is paid. Independent of (and OR'd with) the whole-menu toggle. */
  isSubsidised?: boolean;
}

export interface PanelMenuCategory {
  id: string;
  name: string;
}

interface MenuTabPanelProps {
  menuId: string;
  items: PanelMenuItem[];
  categories: PanelMenuCategory[];
  itemsApiBase: string;
  categoriesApiBase: string;
  onRefetch: () => void;
}

/**
 * The Items/Categories CRUD body shared by the food-court admin's
 * (dashboard/menu) and super admin's (admin/cafes/[id]/menu) menu editors —
 * scoped to a single Menu (Breakfast/Lunch/Evening Snacks/Dinner) selected
 * by the 4-tab wrapper around this component.
 */
export function MenuTabPanel({ menuId, items, categories, itemsApiBase, categoriesApiBase, onRefetch }: MenuTabPanelProps) {
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PanelMenuItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formIsSubsidised, setFormIsSubsidised] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  const [inlineNewCat, setInlineNewCat] = useState("");
  const [inlineCatSaving, setInlineCatSaving] = useState(false);

  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<PanelMenuCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  // Delete/toggle used to fire and refetch without ever looking at the
  // response, so a rejected request just redrew the unchanged row and looked
  // like a dead button.
  const [actionError, setActionError] = useState("");

  // ── Item CRUD ──────────────────────────────────────────

  const openAddModal = () => {
    setEditItem(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormCategory("");
    setFormIsVeg(true);
    setFormIsSubsidised(false);
    setFormImageUrl(null);
    setFormError("");
    setInlineNewCat("");
    setShowModal(true);
  };

  const openEditModal = (item: PanelMenuItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormDescription(item.description || "");
    setFormPrice(String(item.pricePaise / 100));
    setFormCategory(item.categoryId || "");
    setFormIsVeg(item.isVeg);
    setFormIsSubsidised(item.isSubsidised ?? false);
    setFormImageUrl(item.imageUrl);
    setFormError("");
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
    } catch {
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

    const payload = {
      name: formName,
      description: formDescription || null,
      pricePaise: rupeesToPaise(parseFloat(formPrice)),
      categoryId: formCategory,
      isVeg: formIsVeg,
      isSubsidised: formIsSubsidised,
      imageUrl: formImageUrl || null,
      menuId,
    };

    try {
      const res = editItem
        ? await fetch(`${itemsApiBase}/${editItem.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(itemsApiBase, {
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
      onRefetch();
    } catch {
      setFormError("Network error — could not save item.");
    } finally {
      setFormSaving(false);
    }
  };

  const toggleAvailability = async (item: PanelMenuItem) => {
    setActionError("");
    const res = await fetch(`${itemsApiBase}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable, menuId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setActionError(err.error || "Could not update availability.");
      return;
    }
    onRefetch();
  };

  const deleteItem = (item: PanelMenuItem) => {
    const isGlobal = item.cafeId === null;
    setConfirmDialog({
      open: true,
      message: isGlobal
        ? "This is a shared item — removing it only takes it off your menu. Other cafés keep seeing it unchanged."
        : "This menu item will be permanently deleted.",
      onConfirm: async () => {
        setActionError("");
        const url = isGlobal
          ? `${itemsApiBase}/${item.id}?menuId=${encodeURIComponent(menuId)}`
          : `${itemsApiBase}/${item.id}`;
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setActionError(err.error || "Could not delete this item.");
          return;
        }
        onRefetch();
      },
    });
  };

  // ── Category CRUD ──────────────────────────────────────

  const openAddCatModal = () => {
    setEditCat(null);
    setCatName("");
    setShowCatModal(true);
  };

  const openEditCatModal = (cat: PanelMenuCategory) => {
    setEditCat(cat);
    setCatName(cat.name);
    setShowCatModal(true);
  };

  const handleSaveCat = async () => {
    if (!catName.trim()) return;
    setCatSaving(true);
    try {
      if (editCat) {
        await fetch(`${categoriesApiBase}/${editCat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: catName.trim() }),
        });
      } else {
        await fetch(categoriesApiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: catName.trim(), menuId }),
        });
      }
      setShowCatModal(false);
      onRefetch();
    } finally {
      setCatSaving(false);
    }
  };

  const deleteCat = (catId: string) => {
    setConfirmDialog({
      open: true,
      message: "Delete this category? Items in it will become uncategorized.",
      onConfirm: async () => {
        await fetch(`${categoriesApiBase}/${catId}`, { method: "DELETE" });
        onRefetch();
      },
    });
  };

  const handleInlineCreateCat = async () => {
    if (!inlineNewCat.trim()) return;
    setInlineCatSaving(true);
    try {
      const res = await fetch(categoriesApiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inlineNewCat.trim(), menuId }),
      });
      const data = await res.json();
      if (data.success) {
        setFormCategory(data.data.id);
        setInlineNewCat("");
        onRefetch();
      }
    } finally {
      setInlineCatSaving(false);
    }
  };

  return (
    <div>
      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
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

      {/* ─── ITEMS TAB ─────────────────────────────────── */}
      {activeTab === "items" && (
        items.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed size={48} />}
            title="No items on this menu yet"
            description="Add the first item for this menu"
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
                    <span className={cn("w-3.5 h-3.5 rounded-sm border-2", item.isVeg ? "border-green-600" : "border-red-600")}>
                      <span className={cn("block w-1.5 h-1.5 rounded-full m-auto mt-[2px]", item.isVeg ? "bg-green-600" : "bg-red-600")} />
                    </span>
                    <h3 className="font-semibold">{item.name}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={item.isAvailable ? "success" : "danger"}>
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                    {item.cafeId === null && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                        <Globe size={9} />
                        Shared
                      </span>
                    )}
                    {item.isSubsidised && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Gift size={9} />
                        Subsidised
                      </span>
                    )}
                  </div>
                </div>

                {item.description && <p className="text-sm text-muted mb-2 line-clamp-1">{item.description}</p>}

                <p className="text-lg font-bold text-primary mb-3">
                  {item.isSubsidised ? "Free for customers" : paiseToCurrencyShort(item.pricePaise)}
                </p>

                {(() => {
                  const cat = categories.find((c) => c.id === item.categoryId);
                  return cat ? (
                    <p className="text-xs text-muted mb-3">
                      <Tag size={11} className="inline mr-1" />
                      {cat.name}
                    </p>
                  ) : null;
                })()}

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => toggleAvailability(item)} className="flex-1">
                    {item.isAvailable ? <EyeOff size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
                    {item.isAvailable ? "Mark Unavailable" : "Mark Available"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEditModal(item)}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteItem(item)} title={item.cafeId === null ? "Remove from my menu" : "Delete"}>
                    <Trash2 size={14} className="text-danger" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ─── CATEGORIES TAB ────────────────────────────── */}
      {activeTab === "categories" && (
        categories.length === 0 ? (
          <EmptyState
            icon={<Tag size={48} />}
            title="No categories yet"
            description="Categories help organize this menu's items"
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
                <div key={cat.id} className="bg-surface rounded-xl border border-border px-4 py-3 flex items-center justify-between">
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
        )
      )}

      {/* ─── ADD/EDIT ITEM MODAL ───────────────────────── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Menu Item" : "Add Menu Item"}>
        <div className="space-y-4">
          <Input id="item-name" label="Item Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Masala Chai" required />
          <Input id="item-desc" label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" />
          <Input id="item-price" label="Price (in Rupees)" type="number" step="0.01" min="0" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="e.g. 149.50" required />

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
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted text-foreground"
                placeholder="New category name"
                value={inlineNewCat}
                onChange={(e) => setInlineNewCat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInlineCreateCat()}
              />
              <Button size="sm" variant="secondary" onClick={handleInlineCreateCat} loading={inlineCatSaving} disabled={!inlineNewCat.trim()}>
                <FolderPlus size={14} className="mr-1" />
                Add
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Item Image</label>
            {formImageUrl ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border">
                <Image src={formImageUrl} alt="Preview" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                <button type="button" onClick={() => setFormImageUrl(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors">
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
                <span className="text-sm text-muted">{imageUploading ? "Uploading..." : "Click to upload image"}</span>
                <span className="text-xs text-muted/60 mt-0.5">JPEG, PNG, or WebP (max 5 MB)</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Type:</label>
            <button type="button" onClick={() => setFormIsVeg(true)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors", formIsVeg ? "bg-success/15 border-success/50 text-success" : "border-border text-muted")}>
              Veg
            </button>
            <button type="button" onClick={() => setFormIsVeg(false)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors", !formIsVeg ? "bg-danger/15 border-danger/50 text-danger" : "border-border text-muted")}>
              Non-Veg
            </button>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Pricing:</label>
              <button type="button" onClick={() => setFormIsSubsidised(false)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors", !formIsSubsidised ? "bg-success/15 border-success/50 text-success" : "border-border text-muted")}>
                Paid
              </button>
              <button type="button" onClick={() => setFormIsSubsidised(true)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors", formIsSubsidised ? "bg-amber-500/15 border-amber-500/50 text-amber-600" : "border-border text-muted")}>
                Subsidised
              </button>
            </div>
            <p className="text-xs text-muted mt-1.5">
              Subsidised items are free for customers — no price shown, no payment collected for this item — even if the rest of the menu is paid.
            </p>
          </div>

          {formError && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-xl border border-danger/25">{formError}</div>
          )}
          <Button onClick={handleSaveItem} className="w-full" loading={formSaving}>
            {editItem ? "Update Item" : "Add Item"}
          </Button>
        </div>
      </Modal>

      {/* ─── ADD/EDIT CATEGORY MODAL ───────────────────── */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title={editCat ? "Edit Category" : "Add Category"}>
        <div className="space-y-4">
          <Input id="cat-name" label="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Beverages, Snacks, Main Course" required />
          <Button onClick={handleSaveCat} className="w-full" loading={catSaving}>
            {editCat ? "Update Category" : "Create Category"}
          </Button>
        </div>
      </Modal>

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
