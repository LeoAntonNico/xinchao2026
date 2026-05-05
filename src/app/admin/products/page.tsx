"use client";

import { useState, useEffect } from "react";
import { Plus, Package, Pencil, Trash2, Flame, Image, Layers, Puzzle } from "lucide-react";
import { ProductModal } from "./ProductModal";
import type { MenuItem, Category, Location } from "./types";

function check401(response: Response) {
  if (response.status === 401) { window.location.href = "/admin/login"; return true; }
  return false;
}

const DIETARY_LABELS: Record<string, string> = {
  vegan: "V", vegetarian: "VG", "gluten-free": "GF", "dairy-free": "DF", "nut-free": "NF",
};

const TAX_BADGE: Record<string, string> = {
  standard: "21%", reduced: "9%", zero: "0%", alcohol: "21%",
};

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
      fetch("/api/admin/menu-items", { credentials: "include" }).then(async (r) => { if (check401(r)) return []; return r.ok ? r.json() : []; }),
      fetch("/api/admin/categories", { credentials: "include" }).then(async (r) => { if (check401(r)) return []; return r.ok ? r.json() : []; }),
      fetch("/api/admin/locations", { credentials: "include" }).then(async (r) => { if (check401(r)) return []; return r.ok ? r.json() : []; }),
    ]).then(([itemsData, catsData, locsData]) => {
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      setLocations(Array.isArray(locsData) ? locsData : []);
      setLoading(false);
    });
  }, []);

  function handleEdit(item: MenuItem) { setEditingItem(item); setModalOpen(true); }
  function handleAdd() { setEditingItem(null); setModalOpen(true); }
  function handleSave(savedItem: MenuItem) {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === savedItem.id);
      if (exists) return prev.map((i) => (i.id === savedItem.id ? savedItem : i));
      return [...prev, savedItem];
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/menu-items/${id}`, { method: "DELETE", credentials: "include" });
      if (check401(res)) return;
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } finally { setDeletingId(null); }
  }

  function handleCategoryCreated(cat: Category) { setCategories((prev) => [...prev, cat]); }
  function formatPrice(cents: number) { return `€ ${(cents / 100).toFixed(2).replace(".", ",")}`; }

  if (loading) return <div className="text-gray-400 p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Package className="w-6 h-6 text-brand-gold" />Products</h1>
        <button onClick={handleAdd} className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" /> Add Product</button>
      </div>

      <div className="bg-sidebar border border-border-default rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Image</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Categories</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Tax</th>
              <th className="px-4 py-3 font-medium">Locs</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Vars/Mods</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border-default last:border-0 hover:bg-white/5">
                <td className="px-4 py-3">
                  {item.imageUrl ? (
                    <div className="relative w-12 h-12">
                      <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-border-default" />
                      {(item.imageUrls?.length ?? 0) > 1 && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-gold rounded-full flex items-center justify-center text-[8px] font-bold text-black">{item.imageUrls.length}</span>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-border-default rounded-lg border border-gray-700 flex items-center justify-center"><Image className="w-5 h-5 text-gray-600" /></div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-medium">{item.name}</span>
                    {item.isSpicy && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                  </div>
                  {item.shortDescription && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-[200px]">{item.shortDescription}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.categories?.map((cat) => <span key={cat.id} className="px-2 py-0.5 rounded text-xs border border-border-default text-gray-300">{cat.name}</span>) || <span className="text-gray-500 text-xs">-</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    {item.salePrice && item.salePrice < item.price ? (
                      <>
                        <span className="text-gray-300 font-medium">{formatPrice(item.salePrice)}</span>
                        <span className="text-xs text-gray-500 line-through">{formatPrice(item.price)}</span>
                      </>
                    ) : (
                      <span className="text-gray-300 font-medium">{formatPrice(item.price)}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3"><span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">{TAX_BADGE[item.taxClass] || item.taxClass}</span></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.locations?.map((loc) => <span key={loc.id} className="px-1.5 py-0.5 rounded bg-brand-gold/10 text-brand-gold text-[10px] border border-brand-gold/20">{loc.name.replace("Xin Ch\u00e0o ", "")}</span>) || <span className="text-gray-500 text-xs">-</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.dietaryTags?.map((tag) => <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" title={tag}>{DIETARY_LABELS[tag] || tag}</span>)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.variants && item.variants.length > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center gap-0.5"><Layers className="w-3 h-3" />{item.variants.length}</span>}
                    {item.modifiers && item.modifiers.length > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-0.5"><Puzzle className="w-3 h-3" />{item.modifiers.length}</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.isAvailable ? "bg-green-500/15 text-green-400 border border-green-500/20" : "bg-gray-700 text-gray-400 border border-gray-600"}`}>{item.isAvailable ? "Active" : "Sold Out"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-brand-gold transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No products yet.</div>}
      </div>

      <ProductModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} editingItem={editingItem} categories={categories} locations={locations} onCategoryCreated={handleCategoryCreated} />
    </div>
  );
}
