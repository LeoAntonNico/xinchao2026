"use client";

import { useState, useEffect, useCallback } from "react";

function check401(response: Response) {
  if (response.status === 401) {
    window.location.href = "/admin/login";
    return true;
  }
  return false;
}

interface Category { id: string; name: string; }
interface Location { id: string; name: string; }
interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
  categoryId: string;
  locations: Location[];
  category?: Category;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MenuItem) => void;
  editingItem: MenuItem | null;
  categories: Category[];
  locations: Location[];
  onCategoryCreated?: (cat: Category) => void;
}

function CheckCard({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
        checked
          ? "border-brand-red bg-brand-red/15 text-white"
          : "border-border-default text-gray-300 hover:border-gray-500"
      }`}
    >
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          checked
            ? "bg-brand-red border-brand-red"
            : "border-gray-500 bg-transparent"
        }`}
      >
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </span>
      {label}
    </button>
  );
}

export function ProductModal({ isOpen, onClose, onSave, editingItem, categories, locations, onCategoryCreated }: ProductModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setDescription(editingItem.description || "");
      setPriceEur((editingItem.price / 100).toFixed(2).replace(".", ","));
      setImageUrl(editingItem.imageUrl || "");
      setIsAvailable(editingItem.isAvailable);
      setCategoryId(editingItem.categoryId);
      setLocationIds(editingItem.locations?.map((l) => l.id) || []);
      setSortOrder(String(editingItem.sortOrder));
    } else {
      setName("");
      setDescription("");
      setPriceEur("");
      setImageUrl("");
      setIsAvailable(true);
      setCategoryId(categories[0]?.id || "");
      setLocationIds(locations[0] ? [locations[0].id] : []);
      setSortOrder("0");
    }
    setErrors([]);
    setSaving(false);
    setShowNewCat(false);
    setNewCatName("");
  }, [editingItem, isOpen, categories, locations]);

  const validate = useCallback(() => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Name is required");
    if (!priceEur || isNaN(parseFloat(priceEur.replace(",", ".")))) errs.push("Valid price is required");
    if (!categoryId) errs.push("Category is required");
    if (locationIds.length === 0) errs.push("At least one location is required");
    return errs;
  }, [name, priceEur, categoryId, locationIds]);

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newCatName.trim(), sortOrder: categories.length + 1 }),
      });
      if (check401(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setErrors([err.error || `Failed (${res.status})`]);
        return;
      }
      const cat = await res.json();
      onCategoryCreated?.(cat);
      setCategoryId(cat.id);
      setShowNewCat(false);
      setNewCatName("");
    } catch {
      setErrors(["Network error. Please try again."]);
    } finally {
      setCreatingCat(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    const priceNum = Math.round(parseFloat(priceEur.replace(",", ".")) * 100);
    const payload = {
      name,
      description: description || null,
      price: priceNum,
      imageUrl: imageUrl || null,
      isAvailable,
      categoryId,
      locationIds,
      sortOrder: parseInt(sortOrder) || 0,
    };

    try {
      const url = editingItem ? `/api/admin/menu-items/${editingItem.id}` : "/api/admin/menu-items";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (check401(res)) return;
      if (!res.ok) throw new Error("Save failed");
      const item = await res.json();
      onSave(item);
      onClose();
    } catch {
      setErrors(["Failed to save. Please try again."]);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 pt-20 overflow-y-auto pb-10">
      <div className="bg-sidebar border border-border-default rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {editingItem ? "Edit Product" : "Add Product"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              {errors.join(", ")}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
              placeholder="Phở Bò"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500 resize-none"
              placeholder="Traditional beef noodle soup"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Price (&euro;)</label>
              <input
                type="text"
                inputMode="decimal"
                value={priceEur}
                onChange={(e) => setPriceEur(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                placeholder="14,95"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Image URL</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
              placeholder="https://images.unsplash.com/..."
            />
            {imageUrl && (
              <img src={imageUrl} alt="preview" className="mt-2 w-20 h-20 object-cover rounded-lg border border-border-default" />
            )}
          </div>

          {/* Category row + add new */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-400">Category</label>
              {!showNewCat && (
                <button
                  type="button"
                  onClick={() => setShowNewCat(true)}
                  className="text-xs text-brand-gold hover:text-brand-gold/80 font-medium"
                >
                  + New Category
                </button>
              )}
            </div>
            {showNewCat && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCategory(); } }}
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={creatingCat || !newCatName.trim()}
                  className="px-3 py-2 bg-brand-red text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {creatingCat ? "..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewCat(false); setNewCatName(""); }}
                  className="px-3 py-2 text-gray-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <CheckCard
                  key={c.id}
                  label={c.name}
                  checked={categoryId === c.id}
                  onChange={() => setCategoryId(c.id)}
                />
              ))}
            </div>
          </div>

          {/* Location tick boxes - multi-select */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Locations</label>
            <div className="flex flex-wrap gap-2">
              {locations.map((l) => (
                <CheckCard
                  key={l.id}
                  label={l.name}
                  checked={locationIds.includes(l.id)}
                  onChange={() =>
                    setLocationIds((prev) =>
                      prev.includes(l.id) ? prev.filter((id) => id !== l.id) : [...prev, l.id]
                    )
                  }
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-red"
            />
            <span className="text-sm text-gray-300">Available for ordering</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-300 border border-border-default hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-red hover:bg-red-700 text-white transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : editingItem ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
