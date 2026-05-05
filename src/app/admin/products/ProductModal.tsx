"use client";

import type { MenuItem, Category, Location, Variant, Modifier } from "./types";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Upload, Trash2, Plus, Flame, ChevronDown, ChevronUp } from "lucide-react";

function check401(response: Response) {
  if (response.status === 401) { window.location.href = "/admin/login"; return true; }
  return false;
}

const DIETARY_OPTIONS = [
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "dairy-free", label: "Dairy-Free" },
  { value: "nut-free", label: "Nut-Free" },
];

const TAX_CLASSES = [
  { value: "standard", label: "Standard Rate (21%)" },
  { value: "reduced", label: "Reduced Rate (9%)" },
  { value: "zero", label: "Zero Rate (0%)" },
  { value: "alcohol", label: "Alcohol (21%)" },
];

function centsToInput(cents: number | null) {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function inputToCents(val: string) {
  const n = parseFloat(val.replace(",", "."));
  return isNaN(n) ? null : Math.round(n * 100);
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

function CheckCard({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${checked ? "border-brand-red bg-brand-red/15 text-white" : "border-border-default text-gray-300 hover:border-gray-500"}`}>
      <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? "bg-brand-red border-brand-red" : "border-gray-500 bg-transparent"}`}>
        {checked && <span className="text-white text-xs font-bold">&#10003;</span>}
      </span>
      {label}
    </button>
  );
}

function Section({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [expanded, setExpanded] = useState(open);
  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors">
        <span className="text-sm font-semibold text-white">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && <div className="px-4 py-4">{children}</div>}
    </div>
  );
}

export function ProductModal({ isOpen, onClose, onSave, editingItem, categories, locations, onCategoryCreated }: ProductModalProps) {
  // Core fields
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [salePriceEur, setSalePriceEur] = useState("");
  const [taxClass, setTaxClass] = useState("standard");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [isSpicy, setIsSpicy] = useState(false);

  // Variants + Modifiers
  const [variants, setVariants] = useState<Variant[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [newModifierName, setNewModifierName] = useState("");
  const [newModifierPrice, setNewModifierPrice] = useState("");

  // State
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setShortDescription(editingItem.shortDescription || "");
      setDescription(editingItem.description || "");
      setPriceEur(centsToInput(editingItem.price));
      setSalePriceEur(centsToInput(editingItem.salePrice));
      setTaxClass(editingItem.taxClass || "standard");
      setImageUrl(editingItem.imageUrl || "");
      setImageUrls(editingItem.imageUrls || []);
      setIsAvailable(editingItem.isAvailable);
      setSortOrder(String(editingItem.sortOrder));
      setCategoryIds(editingItem.categories?.map((c) => c.id) || []);
      setLocationIds(editingItem.locations?.map((l) => l.id) || []);
      setDietaryTags(editingItem.dietaryTags || []);
      setIsSpicy(editingItem.isSpicy || false);
      setVariants(editingItem.variants || []);
      setModifiers(editingItem.modifiers || []);
    } else {
      setName(""); setShortDescription(""); setDescription("");
      setPriceEur(""); setSalePriceEur(""); setTaxClass("standard");
      setImageUrl(""); setImageUrls([]); setIsAvailable(true);
      setSortOrder("0"); setDietaryTags([]); setIsSpicy(false);
      setVariants([]); setModifiers([]);
      setCategoryIds(categories[0] ? [categories[0].id] : []);
      setLocationIds(locations[0] ? [locations[0].id] : []);
    }
    setErrors([]); setSaving(false); setShowNewCat(false); setNewCatName("");
    setNewVariantName(""); setNewVariantPrice(""); setNewModifierName(""); setNewModifierPrice("");
  }, [editingItem, isOpen, categories, locations]);

  const validate = useCallback(() => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Name required");
    if (!priceEur || isNaN(parseFloat(priceEur.replace(",", ".")))) errs.push("Valid base price required");
    if (categoryIds.length === 0) errs.push("At least one category");
    if (locationIds.length === 0) errs.push("At least one location");
    return errs;
  }, [name, priceEur, categoryIds, locationIds]);

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newCatName.trim(), sortOrder: categories.length + 1 }),
      });
      if (check401(res)) return;
      if (!res.ok) { setErrors(["Category create failed"]); return; }
      const cat = await res.json();
      onCategoryCreated?.(cat);
      setCategoryIds((prev) => [...prev, cat.id]);
      setShowNewCat(false); setNewCatName("");
    } catch {
      setErrors(["Network error"]);
    } finally { setCreatingCat(false); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", credentials: "include", body: form });
      if (check401(res)) return;
      if (!res.ok) { setErrors(["Upload failed"]); return; }
      const { url } = await res.json();
      setImageUrls((prev) => {
        const updated = [...prev, url];
        if (!imageUrl) setImageUrl(url);
        return updated;
      });
      if (!imageUrl) setImageUrl(url);
    } catch {
      setErrors(["Upload error"]);
    } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  function removeImage(idx: number) {
    setImageUrls((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      if (imageUrl === prev[idx]) setImageUrl(updated[0] || "");
      return updated;
    });
  }

  function setPrimary(url: string) { setImageUrl(url); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }
    setSaving(true);

    const priceNum = inputToCents(priceEur)!;
    const saleNum = inputToCents(salePriceEur);
    const payload = {
      name, description: description || null, shortDescription: shortDescription || null,
      price: priceNum, salePrice: saleNum, taxClass,
      imageUrl: imageUrl || null, imageUrls: imageUrls || [], isAvailable,
      categoryIds, locationIds, sortOrder: parseInt(sortOrder) || 0,
      dietaryTags, isSpicy,
    };

    try {
      const url = editingItem ? `/api/admin/menu-items/${editingItem.id}` : "/api/admin/menu-items";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(payload),
      });
      if (check401(res)) return;
      if (!res.ok) throw new Error("Save failed");
      const item: MenuItem = await res.json();

      // Save variants + modifiers
      const newItem = await syncVariantsAndModifiers(item.id);
      newItem.name = item.name; newItem.description = item.description;
      newItem.shortDescription = item.shortDescription; newItem.price = item.price;
      newItem.salePrice = item.salePrice; newItem.taxClass = item.taxClass;
      newItem.imageUrl = item.imageUrl; newItem.imageUrls = item.imageUrls;
      newItem.isAvailable = item.isAvailable; newItem.sortOrder = item.sortOrder;
      newItem.categories = item.categories; newItem.locations = item.locations;
      newItem.dietaryTags = item.dietaryTags; newItem.isSpicy = item.isSpicy;
      newItem.id = item.id;

      onSave(newItem);
      onClose();
    } catch {
      setErrors(["Failed to save. Try again."]);
    } finally { setSaving(false); }
  }

  async function syncVariantsAndModifiers(itemId: string): Promise<MenuItem> {
    // variants: if ID exists, keep; if no ID but name exists, create; if ID in editing but not in state, delete
    const edits: MenuItem | null = editingItem ? editingItem : null;
    const existingV = edits?.variants || [];
    const toDeleteV = existingV.filter((ev) => !variants.find((v) => v.id === ev.id)).map((v) => v.id);
    const toCreateV = variants.filter((v) => !v.id).map((v) => ({ name: v.name, price: v.price, menuItemId: itemId, sortOrder: v.sortOrder }));

    for (const id of toDeleteV) await fetch(`/api/admin/variants/${id}`, { method: "DELETE", credentials: "include" });
    for (const v of toCreateV) await fetch("/api/admin/variants", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(v) });
    // update existing
    for (const v of variants.filter((v) => v.id)) {
      const orig = existingV.find((ev) => ev.id === v.id);
      if (orig && (orig.name !== v.name || orig.price !== v.price)) {
        await fetch(`/api/admin/variants/${v.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: v.name, price: v.price }) });
      }
    }

    // modifiers
    const existingM = edits?.modifiers || [];
    const toDeleteM = existingM.filter((em) => !modifiers.find((m) => m.id === em.id)).map((m) => m.id);
    const toCreateM = modifiers.filter((m) => !m.id).map((m) => ({ name: m.name, price: m.price, menuItemId: itemId, sortOrder: m.sortOrder }));

    for (const id of toDeleteM) await fetch(`/api/admin/modifiers/${id}`, { method: "DELETE", credentials: "include" });
    for (const m of toCreateM) await fetch("/api/admin/modifiers", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(m) });
    for (const m of modifiers.filter((m) => m.id)) {
      const orig = existingM.find((em) => em.id === m.id);
      if (orig && (orig.name !== m.name || orig.price !== m.price)) {
        await fetch(`/api/admin/modifiers/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: m.name, price: m.price }) });
      }
    }

    // return refreshed item
    const res = await fetch(`/api/admin/menu-items/${itemId}`, { credentials: "include" });
    if (res.ok) return await res.json();
    return { id: itemId, name, description, shortDescription, price: inputToCents(priceEur)!, salePrice: inputToCents(salePriceEur), taxClass, imageUrl, imageUrls, isAvailable, sortOrder: parseInt(sortOrder) || 0, dietaryTags, isSpicy, categories: categories.filter((c) => categoryIds.includes(c.id)), locations: locations.filter((l) => locationIds.includes(l.id)), variants, modifiers } as MenuItem;
  }

  function addVariant() {
    if (!newVariantName.trim()) return;
    setVariants((prev) => [...prev, { id: "", name: newVariantName.trim(), price: inputToCents(newVariantPrice) || 0, sortOrder: prev.length }]);
    setNewVariantName(""); setNewVariantPrice("");
  }
  function removeVariant(idx: number) { setVariants((prev) => prev.filter((_, i) => i !== idx)); }

  function addModifier() {
    if (!newModifierName.trim()) return;
    setModifiers((prev) => [...prev, { id: "", name: newModifierName.trim(), price: inputToCents(newModifierPrice) || 0, sortOrder: prev.length }]);
    setNewModifierName(""); setNewModifierPrice("");
  }
  function removeModifier(idx: number) { setModifiers((prev) => prev.filter((_, i) => i !== idx)); }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 pt-12 overflow-y-auto pb-10">
      <div className="bg-sidebar border border-border-default rounded-xl w-full max-w-3xl mx-4 shadow-2xl mb-20">
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between sticky top-0 bg-sidebar z-10 rounded-t-xl">
          <h2 className="text-lg font-bold text-white">{editingItem ? "Edit Product" : "Add Product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.length > 0 && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">{errors.join(", ")}</div>
          )}

          {/* PRICING */}
          <Section title="Pricing">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Regular Price (&#x20AC;)</label>
                <input type="text" inputMode="decimal" value={priceEur} onChange={(e) => setPriceEur(e.target.value)}
                  className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500" placeholder="14,95" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Sale Price (&#x20AC;)</label>
                <input type="text" inputMode="decimal" value={salePriceEur} onChange={(e) => setSalePriceEur(e.target.value)}
                  className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500" placeholder="11,95" />
                {salePriceEur && inputToCents(salePriceEur) && inputToCents(priceEur) && inputToCents(salePriceEur)! >= inputToCents(priceEur)! ? (
                  <p className="text-xs text-red-400 mt-1">Sale price must be lower</p>
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tax Class</label>
                <select value={taxClass} onChange={(e) => setTaxClass(e.target.value)} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500">
                  {TAX_CLASSES.map((tc) => <option key={tc.value} value={tc.value}>{tc.label}</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* CONTENT */}
          <Section title="Content">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Product Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500" placeholder="B&#xFA;n Ch&#x1EA3;" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Short Description <span className="text-gray-500">(appears next to image on front-end)</span></label>
                <input type="text" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500" placeholder="Grilled pork with vermicelli noodles &#x2013; a Hanoi classic" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Long Description <span className="text-gray-500">(detail page / tabs below)</span></label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500 resize-none" placeholder="Full product description..." />
              </div>

              {/* Gallery */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Product Gallery</label>
                <div className="flex flex-wrap gap-3">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`img-${idx}`} className={`w-20 h-20 object-cover rounded-lg border-2 cursor-pointer ${imageUrl === url ? "border-brand-gold" : "border-border-default"}`} onClick={() => setPrimary(url)} />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3 text-white" /></button>
                      {imageUrl === url && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-brand-gold bg-black/80 px-1 rounded">Primary</span>}
                    </div>
                  ))}
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-300 transition-colors">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">{uploading ? "..." : "Upload"}</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </div>
                <p className="text-[11px] text-gray-500 mt-2">Click an image to set as primary. Click &#x2715; to remove. Supported: JPG, PNG, WEBP.</p>
              </div>
            </div>
          </Section>

          {/* VARIANTS */}
          <Section title="Variations (Size / Portion Options)">
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2 bg-background border border-border-default rounded-lg px-3 py-2">
                  <span className="text-sm text-white flex-1">{v.name}</span>
                  <span className="text-sm text-gray-400">{v.price ? `&#x20AC; ${(v.price / 100).toFixed(2).replace(".", ",")}` : "Same as base"}</span>
                  <button type="button" onClick={() => removeVariant(i)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="text" value={newVariantName} onChange={(e) => setNewVariantName(e.target.value)} placeholder="Variant name (e.g. Large)" className="flex-1 bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariant(); } }} />
                <input type="text" inputMode="decimal" value={newVariantPrice} onChange={(e) => setNewVariantPrice(e.target.value)} placeholder="Price (or leave empty)" className="w-32 bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariant(); } }} />
                <button type="button" onClick={addVariant} className="px-3 py-2 bg-brand-gold/20 text-brand-gold border border-brand-gold/30 rounded-lg text-sm font-medium hover:bg-brand-gold/30"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </Section>

          {/* MODIFIERS */}
          <Section title="Add-ons & Extras (Modifiers)">
            <div className="space-y-2">
              {modifiers.map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-background border border-border-default rounded-lg px-3 py-2">
                  <span className="text-sm text-white flex-1">{m.name}</span>
                  <span className="text-sm text-gray-400">{m.price ? `+&#x20AC; ${(m.price / 100).toFixed(2).replace(".", ",")}` : "Free"}</span>
                  <button type="button" onClick={() => removeModifier(i)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="text" value={newModifierName} onChange={(e) => setNewModifierName(e.target.value)} placeholder="Add-on name (e.g. Extra Pork)" className="flex-1 bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addModifier(); } }} />
                <input type="text" inputMode="decimal" value={newModifierPrice} onChange={(e) => setNewModifierPrice(e.target.value)} placeholder="Extra cost" className="w-32 bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addModifier(); } }} />
                <button type="button" onClick={addModifier} className="px-3 py-2 bg-brand-gold/20 text-brand-gold border border-brand-gold/30 rounded-lg text-sm font-medium hover:bg-brand-gold/30"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </Section>

          {/* CATEGORIES */}
          <Section title="Categories">
            <div className="flex items-center justify-between mb-2">
              {!showNewCat && <button type="button" onClick={() => setShowNewCat(true)} className="text-xs text-brand-gold hover:text-brand-gold/80 font-medium">+ New Category</button>}
            </div>
            {showNewCat && (
              <div className="flex gap-2 mb-3">
                <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name" className="flex-1 bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCategory(); } }} />
                <button type="button" onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()} className="px-3 py-2 bg-brand-red text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{creatingCat ? "..." : "Create"}</button>
                <button type="button" onClick={() => { setShowNewCat(false); setNewCatName(""); }} className="px-3 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => <CheckCard key={c.id} label={c.name} checked={categoryIds.includes(c.id)} onChange={() => setCategoryIds((prev) => prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id])} />)}
            </div>
          </Section>

          {/* LOCATIONS */}
          <Section title="Locations">
            <div className="flex flex-wrap gap-2">
              {locations.map((l) => <CheckCard key={l.id} label={l.name} checked={locationIds.includes(l.id)} onChange={() => setLocationIds((prev) => prev.includes(l.id) ? prev.filter((id) => id !== l.id) : [...prev, l.id])} />)}
            </div>
          </Section>

          {/* DIETARY */}
          <Section title="Dietary & Spicy">
            <div className="flex flex-wrap gap-2 mb-3">
              {DIETARY_OPTIONS.map((opt) => <CheckCard key={opt.value} label={opt.label} checked={dietaryTags.includes(opt.value)} onChange={() => setDietaryTags((prev) => prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value])} />)}
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={isSpicy} onChange={(e) => setIsSpicy(e.target.checked)} className="w-4 h-4 rounded accent-brand-red" />
              <span className="text-sm text-gray-300">Spicy <Flame className="w-3.5 h-3.5 text-orange-400 inline ml-1" /></span>
            </label>
          </Section>

          {/* AVAILABILITY */}
          <Section title="Availability & Sort">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Sort Order</label>
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="w-4 h-4 rounded accent-brand-red" />
                  <span className="text-sm text-gray-300">Available for ordering</span>
                </label>
              </div>
            </div>
          </Section>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-300 border border-border-default hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-red hover:bg-red-700 text-white transition-colors disabled:opacity-50">{saving ? "Saving..." : editingItem ? "Update Product" : "Create Product"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
