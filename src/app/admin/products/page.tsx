"use client";

import { useState, useEffect } from "react";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import { ProductModal } from "./ProductModal";

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

export default function ProductsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/menu-items").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/locations").then((r) => r.json()),
    ]).then(([itemsData, catsData, locsData]) => {
      setItems(itemsData);
      setCategories(catsData);
      setLocations(locsData);
      setLoading(false);
    });
  }, []);

  function handleEdit(item: MenuItem) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingItem(null);
    setModalOpen(true);
  }

  function handleSave(savedItem: MenuItem) {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === savedItem.id);
      if (exists) {
        return prev.map((i) => (i.id === savedItem.id ? savedItem : i));
      }
      return [...prev, savedItem];
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/menu-items/${id}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function handleCategoryCreated(cat: Category) {
    setCategories((prev) => [...prev, cat]);
  }

  const formatPrice = (cents: number) =>
    `€ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  if (loading) return <div className="text-gray-400 p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-brand-gold" />
          Products
        </h1>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="bg-sidebar border border-border-default rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Image</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Locations</th>
              <th className="px-4 py-3 font-medium">Available</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border-default last:border-0 hover:bg-white/5">
                <td className="px-4 py-3">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-border-default" />
                  ) : (
                    <div className="w-12 h-12 bg-background rounded-lg border border-border-default" />
                  )}
                </td>
                <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                <td className="px-4 py-3 text-gray-300">{item.category?.name || "-"}</td>
                <td className="px-4 py-3 text-gray-300">{formatPrice(item.price)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.locations?.map((loc) => (
                      <span key={loc.id} className="px-2 py-0.5 rounded bg-brand-gold/10 text-brand-gold text-xs border border-brand-gold/20">
                        {loc.name}
                      </span>
                    )) || <span className="text-gray-500 text-xs">-</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.isAvailable ? "bg-green-500/15 text-green-400 border border-green-500/20" : "bg-gray-700 text-gray-400 border border-gray-600"}`}>
                    {item.isAvailable ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-brand-gold transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No products yet.</div>
        )}
      </div>

      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingItem={editingItem}
        categories={categories}
        locations={locations}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  );
}
