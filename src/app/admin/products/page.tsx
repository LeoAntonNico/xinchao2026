"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  locationId: string;
  category?: Category;
  location?: Location;
}

export default function ProductsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes, locsRes] = await Promise.all([
        fetch("/api/admin/menu-items"),
        fetch("/api/admin/categories"),
        fetch("/api/admin/locations"),
      ]);
      const itemsData = await itemsRes.json();
      const catsData = await catsRes.json();
      const locsData = await locsRes.json();
      setItems(itemsRes.ok ? itemsData : []);
      setCategories(catsRes.ok ? catsData : []);
      setLocations(locsRes.ok ? locsData : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleEdit(item: MenuItem) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function handleCreate() {
    setEditingItem(null);
    setModalOpen(true);
  }

  function handleSave(savedItem: MenuItem) {
    setItems((prev) => {
      if (editingItem) {
        return prev.map((i) => (i.id === savedItem.id ? savedItem : i));
      }
      return [savedItem, ...prev];
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/menu-items/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  function getCategoryName(id: string) {
    return categories.find((c) => c.id === id)?.name || "—";
  }

  function getLocationName(id: string) {
    return locations.find((l) => l.id === id)?.name || "—";
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">Products</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Products</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-red hover:bg-red-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="bg-sidebar border border-border-default rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-gray-800 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium w-14">Image</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Available</th>
                <th className="px-4 py-3 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No products yet. Click "Add Product" to get started.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-2">
                      <img
                        src={item.imageUrl || "https://via.placeholder.com/40?text=?"}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded-lg"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{item.name}</div>
                      {item.description && <div className="text-gray-500 text-xs">{item.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{getCategoryName(item.categoryId)}</td>
                    <td className="px-4 py-3 text-gray-300">{getLocationName(item.locationId)}</td>
                    <td className="px-4 py-3 text-white font-medium">€{(item.price / 100).toFixed(2).replace(".", ",")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${item.isAvailable ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                        {item.isAvailable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingItem={editingItem}
        categories={categories}
        locations={locations}
      />
    </div>
  );
}
