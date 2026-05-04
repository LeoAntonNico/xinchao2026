"use client";

import { useState, useEffect, useCallback } from "react";

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
  locationId: string;
  category?: Category;
  location?: Location;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MenuItem) => void;
  editingItem: MenuItem | null;
  categories: Category[];
  locations: Location[];
}

export function ProductModal({ isOpen, onClose, onSave, editingItem, categories, locations }: ProductModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setDescription(editingItem.description || "");
      setPriceEur((editingItem.price / 100).toFixed(2));
      setImageUrl(editingItem.imageUrl || "");
      setIsAvailable(editingItem.isAvailable);
      setCategoryId(editingItem.categoryId);
      setLocationId(editingItem.locationId);
      setSortOrder(String(editingItem.sortOrder));
    } else {
      setName("");
      setDescription("");
      setPriceEur("");
      setImageUrl("");
      setIsAvailable(true);
      setCategoryId(categories[0]?.id || "");
      setLocationId(locations[0]?.id || "");
      setSortOrder("0");
    }
    setErrors([]);
    setSaving(false);
  }, [editingItem, isOpen, categories, locations]);

  const validate = useCallback(() => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Name is required");
    if (!priceEur || isNaN(parseFloat(priceEur))) errs.push("Valid price is required");
    if (!categoryId) errs.push("Category is required");
    if (!locationId) errs.push("Location is required");
    return errs;
  }, [name, priceEur, categoryId, locationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    const payload = {
      name,
      description: description || null,
      price: Math.round(parseFloat(priceEur) * 100),
      imageUrl: imageUrl || null,
      isAvailable,
      categoryId,
      locationId,
      sortOrder: parseInt(sortOrder) || 0,
    };

    try {
      const url = editingItem ? `/api/admin/menu-items/${editingItem.id}` : "/api/admin/menu-items";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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
            ×
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
              <label className="block text-xs font-medium text-gray-400 mb-1">Price (€)</label>
              <input
                type="number"
                step="0.01"
                value={priceEur}
                onChange={(e) => setPriceEur(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                placeholder="14.95"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Location</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
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
