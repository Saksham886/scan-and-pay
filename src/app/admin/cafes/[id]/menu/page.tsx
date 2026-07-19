"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
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
  ArrowLeft,
  ExternalLink,
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
}

interface CafeInfo {
  id: string;
  name: string;
  slug: string;
}

export default function AdminCafeMenuPage() {
  const { id: cafeId } = useParams<{ id: string }>();
  const router = useRouter();

  const [cafe, setCafe] = useState<CafeInfo | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Inline category creation state
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySaving, setNewCategorySaving] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  const apiBase = `/api/admin/cafes/${cafeId}/menu`;

  const fetchData = useCallback(async () => {
    try {
      const [menuRes, cafeRes] = await Promise.all([
        fetch(apiBase),
        fetch(`/api/admin/cafes/${cafeId}`),
      ]);
      const menuData = await menuRes.json();
      const cafeData = await cafeRes.json();

      if (menuData.success) {
        setItems(menuData.data.items);
        setCategories(menuData.data.categories);
      }
      if (cafeData.success) {
        setCafe(cafeData.data);
      }
    } catch (err) {
      console.error("Failed to fetch menu:", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, cafeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetCategoryInlineForm = () => {
    setShowNewCategory(false);
    setNewCategoryName("");
  };

  const openAddModal = () => {
    setEditItem(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormCategory("");
    setFormIsVeg(true);
    setFormImageUrl(null);
    resetCategoryInlineForm();
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
    resetCategoryInlineForm();
    setShowModal(true);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setNewCategorySaving(true);
    try {
      const res = await fetch(`/api/admin/cafes/${cafeId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        const created: MenuCategory = data.data;
        setCategories((prev) => [...prev, created]);
        setFormCategory(created.id);
        resetCategoryInlineForm();
      }
    } catch (err) {
      console.error("Failed to create category:", err);
    } finally {
      setNewCategorySaving(false);
    }
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

  const handleSave = async () => {
    if (!formName || !formPrice) return;
    setFormSaving(true);

    const payload = {
      name: formName,
      description: formDescription || null,
      pricePaise: rupeesToPaise(parseFloat(formPrice)),
      categoryId: formCategory || null,
      isVeg: formIsVeg,
      imageUrl: formImageUrl || null,
    };

    try {
      if (editItem) {
        await fetch(`${apiBase}/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setFormSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    await fetch(`${apiBase}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    fetchData();
  };

  const deleteItem = (id: string) => {
    setConfirmDialog({
      open: true,
      message: "This menu item will be permanently deleted.",
      onConfirm: async () => {
        await fetch(`${apiBase}/${id}`, { method: "DELETE" });
        fetchData();
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => router.push(`/admin/cafes/${cafeId}`)}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to {cafe?.name || "Cafe"}
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              Menu {cafe ? `- ${cafe.name}` : ""}
            </h1>
            {cafe && (
              <a
                href={`/${cafe.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink size={12} />
                Customer view
              </a>
            )}
          </div>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={18} className="mr-1.5" />
          Add Item
        </Button>
      </div>

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
          description="Add the first menu item for this cafe"
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
                      item.isVeg ? "border-green-600" : "border-red-500"
                    )}
                  >
                    <span className={cn(
                      "block w-1.5 h-1.5 rounded-full m-auto mt-[2px]",
                      item.isVeg ? "bg-green-600" : "bg-red-500"
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
                <p className="text-xs text-muted mb-3">Category: {item.category.name}</p>
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

      {/* Add/Edit Modal */}
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">Category</label>
              {!showNewCategory && (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={12} />
                  Create new category
                </button>
              )}
            </div>
            <select
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
            >
              <option value="">No Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {showNewCategory && (
              <div className="mt-2 flex gap-2 items-center">
                <input
                  type="text"
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory();
                    if (e.key === "Escape") resetCategoryInlineForm();
                  }}
                  placeholder="e.g. Beverages"
                  className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={newCategorySaving || !newCategoryName.trim()}
                  className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {newCategorySaving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={resetCategoryInlineForm}
                  className="p-2 rounded-xl hover:bg-surface-hover text-muted"
                >
                  <X size={14} />
                </button>
              </div>
            )}
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
          <Button onClick={handleSave} className="w-full" loading={formSaving}>
            {editItem ? "Update Item" : "Add Item"}
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
