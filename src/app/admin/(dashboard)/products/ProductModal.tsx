"use client";

import type { MenuItem, Category, Location, Variant, Modifier, DietaryOption, Exclusion, PlasticSurcharge } from "./types";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Upload, Trash2, Plus, Flame, Pencil, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import ExclusionPanel from "./ExclusionPanel";

function check401(response: Response) {
  if (response.status === 401) { window.location.href = "/admin/login"; return true; }
  return false;
}



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
    <button type="button" onClick={onChange} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${checked ? "border-brand-red bg-brand-red/15 text-foreground" : "border-border-default text-gray-500 hover:border-gray-500"}`}>
      <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? "bg-brand-red border-brand-red" : "border-gray-500 bg-transparent"}`}>
        {checked && <span className="text-foreground text-xs font-bold">&#10003;</span>}
      </span>
      {label}
    </button>
  );
}

function Section({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [expanded, setExpanded] = useState(open);
  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-gray-100 transition-colors">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && <div className="px-4 py-4">{children}</div>}
    </div>
  );
}

export function ProductModal({ isOpen, onClose, onSave, editingItem, categories, locations, onCategoryCreated }: ProductModalProps) {
  // Core fields
  const [name, setName] = useState("");
  const [nameNl, setNameNl] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [shortDescriptionNl, setShortDescriptionNl] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionNl, setDescriptionNl] = useState("");
  const [langTab, setLangTab] = useState<"en" | "nl">("en");
  const [priceEur, setPriceEur] = useState("");
  const [salePriceEur, setSalePriceEur] = useState("");
  const [taxClass, setTaxClass] = useState("standard");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isDineInOnly, setIsDineInOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [plasticSurcharges, setPlasticSurcharges] = useState<PlasticSurcharge[]>([]);
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [isSpicy, setIsSpicy] = useState(false);

  // Dietary Options (fetched from DB)
  const [dietaryOptions, setDietaryOptions] = useState<DietaryOption[]>([]);
  const [editingDietaryId, setEditingDietaryId] = useState<string | null>(null);
  const [editDietaryEn, setEditDietaryEn] = useState('');
  const [editDietaryNl, setEditDietaryNl] = useState('');
  const [dietaryUploading, setDietaryUploading] = useState<string | null>(null);
  const dietaryFileRef = useRef<HTMLInputElement>(null);

  // Variants + Modifiers
  const [variants, setVariants] = useState<Variant[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantNameNl, setNewVariantNameNl] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [newModifierName, setNewModifierName] = useState("");
  const [newModifierNameNl, setNewModifierNameNl] = useState("");
  const [newModifierPrice, setNewModifierPrice] = useState("");

  // Edit variants inline
  const [editingVariantIdx, setEditingVariantIdx] = useState<number | null>(null);
  const [editVariantName, setEditVariantName] = useState("");
  const [editVariantNameNl, setEditVariantNameNl] = useState("");
  const [editVariantPrice, setEditVariantPrice] = useState("");
  const [dragVariantIdx, setDragVariantIdx] = useState<number | null>(null);

  // Edit modifiers inline
  const [editingModifierIdx, setEditingModifierIdx] = useState<number | null>(null);
  const [editModifierName, setEditModifierName] = useState("");
  const [editModifierNameNl, setEditModifierNameNl] = useState("");
  const [editModifierPrice, setEditModifierPrice] = useState("");
  const [dragModifierIdx, setDragModifierIdx] = useState<number | null>(null);

  // State
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch dietary options when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/admin/dietary-options", { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: DietaryOption[]) => setDietaryOptions(data))
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setNameNl(editingItem.nameNl || "");
      setShortDescription(editingItem.shortDescription || "");
      setShortDescriptionNl(editingItem.shortDescriptionNl || "");
      setDescription(editingItem.description || "");
      setDescriptionNl(editingItem.descriptionNl || "");
      setPriceEur(centsToInput(editingItem.price));
      setSalePriceEur(centsToInput(editingItem.salePrice));
      setTaxClass(editingItem.taxClass || "standard");
      setImageUrl(editingItem.imageUrl || "");
      setImageUrls(editingItem.imageUrls || []);
      setIsAvailable(editingItem.isAvailable);
      setIsDineInOnly(editingItem.isDineInOnly || false);
      setSortOrder(String(editingItem.sortOrder));
      setCategoryIds(editingItem.categories?.map((c) => c.id) || []);
      setLocationIds(editingItem.locations?.map((l) => l.id) || []);
      setPlasticSurcharges(editingItem.plasticSurcharges || []);
      setDietaryTags(editingItem.dietaryTags || []);
      setIsSpicy(editingItem.isSpicy || false);
      setVariants(editingItem.variants || []);
      setModifiers(editingItem.modifiers || []);
      setExclusions(editingItem.exclusions || []);
    } else {
      setName(""); setNameNl(""); setShortDescription(""); setShortDescriptionNl(""); setDescription(""); setDescriptionNl("");
      setPriceEur(""); setSalePriceEur(""); setTaxClass("standard");
      setImageUrl(""); setImageUrls([]); setIsAvailable(true); setIsDineInOnly(false);
      setSortOrder("0"); setDietaryTags([]); setIsSpicy(false);
      setVariants([]); setModifiers([]);
      setCategoryIds(categories[0] ? [categories[0].id] : []);
      setLocationIds(locations[0] ? [locations[0].id] : []);
      setPlasticSurcharges([]);
    }
    setErrors([]); setSaving(false); setShowNewCat(false); setNewCatName("");
    setNewVariantName(""); setNewVariantNameNl(""); setNewVariantPrice("");
    setNewModifierName(""); setNewModifierNameNl(""); setNewModifierPrice("");
  }, [editingItem, isOpen, categories, locations]);

  const validate = useCallback(() => {
    const errs: string[] = [];
    if (!name.trim()) errs.push(langTab === "nl" ? "Naam verplicht" : "Name required");
    if (!priceEur || isNaN(parseFloat(priceEur.replace(",", ".")))) errs.push(langTab === "nl" ? "Geldige basisprijs verplicht" : "Valid base price required");
    if (categoryIds.length === 0) errs.push(langTab === "nl" ? "Minimaal één categorie" : "At least one category");
    if (locationIds.length === 0) errs.push(langTab === "nl" ? "Minimaal één locatie" : "At least one location");
    // Validate variant names for selected language
    const vNameEmpty = variants.some((v) => langTab === "en" ? !v.name.trim() : !v.nameNl?.trim() && !v.name.trim());
    if (vNameEmpty) errs.push(`All variants need a ${langTab === "en" ? "naam" : "Nederlandse naam"}`);
    const mNameEmpty = modifiers.some((m) => langTab === "nl" ? !m.nameNl?.trim() && !m.name.trim() : false);
    if (mNameEmpty) errs.push(langTab === "nl" ? "Alle toevoegingen hebben een Nederlandse naam nodig" : "All modifiers need a Dutch name");
    return errs;
  }, [name, priceEur, categoryIds, locationIds, variants, modifiers, langTab]);

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
      if (!res.ok) { const err = await res.json().catch(() => ({})); setErrors([err.error || "Category create failed"]); return; }
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
      console.log("[Upload] status:", res.status, "headers:", Object.fromEntries([...res.headers]));
      const responseText = await res.text();
      console.log("[Upload] body:", responseText);
      if (check401(res)) return;
      if (!res.ok) { setErrors([`Upload failed (${res.status}): ${responseText}`]); return; }
      let data;
      try { data = JSON.parse(responseText); } catch { setErrors(["Upload: invalid JSON response"]); return; }
      const url = data.url;
      setImageUrls((prev) => {
        const updated = [...prev, url];
        if (!imageUrl) setImageUrl(url);
        return updated;
      });
      if (!imageUrl) setImageUrl(url);
    } catch (err: any) {
      console.error("[Upload] network error:", err);
      setErrors([`Upload error: ${err?.message || "Network error"}`]);
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
    const payloadPlasticSurcharges = locations
      .map((location) => {
        const surcharge = plasticSurcharges.find((entry) => entry.locationId === location.id);
        return {
          locationId: location.id,
          amount: surcharge?.amount || 0,
          isActive: Boolean(surcharge?.isActive),
        };
      })
      .filter((surcharge) => surcharge.isActive || surcharge.amount > 0);
    const payload = {
      name, nameNl: nameNl || null, description: description || null, descriptionNl: descriptionNl || null,
      shortDescription: shortDescription || null, shortDescriptionNl: shortDescriptionNl || null,
      price: priceNum, salePrice: saleNum, taxClass,
      imageUrl: imageUrl || null, imageUrls: imageUrls || [], isAvailable, isDineInOnly,
      categoryIds, locationIds, sortOrder: parseInt(sortOrder) || 0,
      dietaryTags, isSpicy, plasticSurcharges: payloadPlasticSurcharges,
    };

    try {
      const url = editingItem ? `/api/admin/menu-items/${editingItem.id}` : "/api/admin/menu-items";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(payload),
      });
      if (check401(res)) return;
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || "Save failed"); }
      const item: MenuItem = await res.json();

      // Save variants + modifiers
      const newItem = await syncVariantsAndModifiers(item.id);
      newItem.name = item.name; newItem.description = item.description;
      newItem.shortDescription = item.shortDescription; newItem.price = item.price;
      newItem.salePrice = item.salePrice; newItem.taxClass = item.taxClass;
      newItem.imageUrl = item.imageUrl; newItem.imageUrls = item.imageUrls;
      newItem.isAvailable = item.isAvailable; newItem.isDineInOnly = item.isDineInOnly; newItem.sortOrder = item.sortOrder;
      newItem.categories = item.categories; newItem.locations = item.locations;
      newItem.plasticSurcharges = item.plasticSurcharges || payloadPlasticSurcharges;
      newItem.dietaryTags = item.dietaryTags; newItem.isSpicy = item.isSpicy;
      newItem.id = item.id;

      onSave(newItem);
      onClose();
    } catch {
      setErrors([langTab === "nl" ? "Opslaan mislukt. Probeer opnieuw." : "Failed to save. Try again."]);
    } finally { setSaving(false); }
  }

  async function syncVariantsAndModifiers(itemId: string): Promise<MenuItem> {
    const edits: MenuItem | null = editingItem ? editingItem : null;
    const existingV = edits?.variants || [];
    const toDeleteV = existingV.filter((ev) => !variants.find((v) => v.id === ev.id)).map((v) => v.id);
    const toCreateV = variants.filter((v) => !v.id).map((v) => ({ name: v.name, nameNl: v.nameNl ?? null, price: v.price, menuItemId: itemId, sortOrder: v.sortOrder }));

    for (const id of toDeleteV) await fetch(`/api/admin/variants/${id}`, { method: "DELETE", credentials: "include" });
    for (const v of toCreateV) await fetch("/api/admin/variants", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(v) });
    for (const v of variants.filter((v) => v.id)) {
      const orig = existingV.find((ev) => ev.id === v.id);
      if (orig && (orig.name !== v.name || orig.nameNl !== v.nameNl || orig.price !== v.price)) {
        await fetch(`/api/admin/variants/${v.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: v.name, nameNl: v.nameNl ?? null, price: v.price }) });
      }
    }

    const existingM = edits?.modifiers || [];
    const toDeleteM = existingM.filter((em) => !modifiers.find((m) => m.id === em.id)).map((m) => m.id);
    const toCreateM = modifiers.filter((m) => !m.id).map((m) => ({ name: m.name, nameNl: m.nameNl ?? null, price: m.price, menuItemId: itemId, sortOrder: m.sortOrder }));

    for (const id of toDeleteM) await fetch(`/api/admin/modifiers/${id}`, { method: "DELETE", credentials: "include" });
    for (const m of toCreateM) await fetch("/api/admin/modifiers", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(m) });
    for (const m of modifiers.filter((m) => m.id)) {
      const orig = existingM.find((em) => em.id === m.id);
      if (orig && (orig.name !== m.name || orig.nameNl !== m.nameNl || orig.price !== m.price)) {
        await fetch(`/api/admin/modifiers/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: m.name, nameNl: m.nameNl ?? null, price: m.price }) });
      }
    }

    const res = await fetch(`/api/admin/menu-items/${itemId}`, { credentials: "include" });
    if (res.ok) return await res.json();
    return { id: itemId, name, nameNl: nameNl || null, description, descriptionNl: descriptionNl || null, shortDescription, shortDescriptionNl: shortDescriptionNl || null, price: inputToCents(priceEur)!, salePrice: inputToCents(salePriceEur), taxClass, imageUrl, imageUrls, isAvailable, isDineInOnly, sortOrder: parseInt(sortOrder) || 0, dietaryTags, isSpicy, categories: categories.filter((c) => categoryIds.includes(c.id)), locations: locations.filter((l) => locationIds.includes(l.id)), plasticSurcharges, variants, modifiers, exclusions } as MenuItem;
  }

  function updatePlasticSurcharge(locationId: string, patch: Partial<PlasticSurcharge>) {
    setPlasticSurcharges((prev) => {
      const existing = prev.find((entry) => entry.locationId === locationId);
      if (existing) {
        return prev.map((entry) => entry.locationId === locationId ? { ...entry, ...patch } : entry);
      }
      return [...prev, { locationId, amount: 0, isActive: false, ...patch }];
    });
  }

  function plasticSurchargeFor(locationId: string) {
    return plasticSurcharges.find((entry) => entry.locationId === locationId) || { locationId, amount: 0, isActive: false };
  }

  function addVariant() {
    const en = newVariantName.trim();
    const nl = newVariantNameNl.trim();
    if (!en && !nl) return;
    setVariants((prev) => [...prev, { id: "", name: en || nl, nameNl: nl || null, price: inputToCents(newVariantPrice) || 0, sortOrder: prev.length }]);
    setNewVariantName(""); setNewVariantNameNl(""); setNewVariantPrice("");
  }
  function removeVariant(idx: number) { setVariants((prev) => prev.filter((_, i) => i !== idx)); }

  function addModifier() {
    const en = newModifierName.trim();
    const nl = newModifierNameNl.trim();
    if (!en && !nl) return;
    setModifiers((prev) => [...prev, { id: "", name: en || nl, nameNl: nl || null, price: inputToCents(newModifierPrice) || 0, sortOrder: prev.length }]);
    setNewModifierName(""); setNewModifierNameNl(""); setNewModifierPrice("");
  }
  function removeModifier(idx: number) { setModifiers((prev) => prev.filter((_, i) => i !== idx)); }

  // --- Variant edit + drag helpers ---
  function startEditVariant(idx: number) {
    const v = variants[idx];
    setEditingVariantIdx(idx);
    setEditVariantName(v.name);
    setEditVariantNameNl(v.nameNl || "");
    setEditVariantPrice(centsToInput(v.price));
  }
  function saveEditVariant() {
    if (editingVariantIdx === null) return;
    setVariants((prev) => {
      const next = [...prev];
      next[editingVariantIdx] = {
        ...next[editingVariantIdx],
        name: editVariantName.trim() || next[editingVariantIdx].name,
        nameNl: editVariantNameNl.trim() || null,
        price: inputToCents(editVariantPrice) || 0,
      };
      return next;
    });
    setEditingVariantIdx(null);
  }
  function cancelEditVariant() { setEditingVariantIdx(null); }

  function handleVariantDragStart(idx: number) { setDragVariantIdx(idx); }
  function handleVariantDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragVariantIdx === null || dragVariantIdx === idx) return;
    setVariants((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragVariantIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragVariantIdx(idx);
  }
  function handleVariantDrop() { setDragVariantIdx(null); }

  // --- Modifier edit + drag helpers ---
  function startEditModifier(idx: number) {
    const m = modifiers[idx];
    setEditingModifierIdx(idx);
    setEditModifierName(m.name);
    setEditModifierNameNl(m.nameNl || "");
    setEditModifierPrice(centsToInput(m.price));
  }
  function saveEditModifier() {
    if (editingModifierIdx === null) return;
    setModifiers((prev) => {
      const next = [...prev];
      next[editingModifierIdx] = {
        ...next[editingModifierIdx],
        name: editModifierName.trim() || next[editingModifierIdx].name,
        nameNl: editModifierNameNl.trim() || null,
        price: inputToCents(editModifierPrice) || 0,
      };
      return next;
    });
    setEditingModifierIdx(null);
  }
  function cancelEditModifier() { setEditingModifierIdx(null); }

  function handleModifierDragStart(idx: number) { setDragModifierIdx(idx); }
  function handleModifierDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragModifierIdx === null || dragModifierIdx === idx) return;
    setModifiers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragModifierIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragModifierIdx(idx);
  }
  function handleModifierDrop() { setDragModifierIdx(null); }

  // Helper to compute display name for variant/modifier given current language tab
  function displayName(item: { name: string; nameNl: string | null }) {
    if (langTab === "nl" && item.nameNl) return item.nameNl;
    return item.name;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 pt-12 overflow-y-auto pb-10">
      <div className="bg-white border border-border-default rounded-xl w-full max-w-3xl mx-4 shadow-2xl mb-20">
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between sticky top-0 bg-white z-20 rounded-t-xl">
          <h2 className="text-lg font-bold text-foreground">{editingItem ? (langTab === "nl" ? "Product Bewerken" : "Edit Product") : (langTab === "nl" ? "Product Toevoegen" : "Add Product")}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-foreground text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Language Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
              <button type="button" onClick={() => setLangTab("en")} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${langTab === "en" ? "bg-brand-red text-foreground" : "text-gray-400 hover:text-foreground"}`}>English</button>
              <button type="button" onClick={() => setLangTab("nl")} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${langTab === "nl" ? "bg-brand-red text-foreground" : "text-gray-400 hover:text-foreground"}`}>Nederlands</button>
            </div>
            {editingItem && (
              <span className="text-xs text-gray-500">
                {nameNl || shortDescriptionNl || descriptionNl || variants.some(v => v.nameNl) || modifiers.some(m => m.nameNl) ? langTab === "nl" ? "Heeft Nederlandse content" : "Has Dutch content" : langTab === "nl" ? "Nog geen Nederlandse content" : "No Dutch content yet"}
              </span>
            )}
          </div>

          {errors.length > 0 && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">{errors.join(", ")}</div>
          )}

          {/* CONTENT */}
          <Section title={langTab === "nl" ? "Inhoud" : "Content"}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{langTab === "en" ? "Product Name" : "Productnaam"} <span className="text-red-400">*</span></label>
                <input type="text" value={langTab === "en" ? name : nameNl} onChange={(e) => langTab === "en" ? setName(e.target.value) : setNameNl(e.target.value)} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" placeholder={langTab === "en" ? "Bún Chả" : "Bún Chả"} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{langTab === "en" ? "Short Description" : "Korte beschrijving"} <span className="text-gray-500">{langTab === "en" ? "(appears next to image on front-end)" : "(naast afbeelding op de site)"}</span></label>
                <input type="text" value={langTab === "en" ? shortDescription : shortDescriptionNl} onChange={(e) => langTab === "en" ? setShortDescription(e.target.value) : setShortDescriptionNl(e.target.value)} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" placeholder={langTab === "en" ? "Grilled pork with vermicelli noodles – a Hanoi classic" : "Gegrild varkensvlees met rijstvermicelli"} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{langTab === "en" ? "Long Description" : "Lange beschrijving"} <span className="text-gray-500">{langTab === "en" ? "(detail page / tabs below)" : "(detailpagina)"}</span></label>
                <textarea rows={3} value={langTab === "en" ? description : descriptionNl} onChange={(e) => langTab === "en" ? setDescription(e.target.value) : setDescriptionNl(e.target.value)} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500 resize-none" placeholder={langTab === "en" ? "Full product description..." : "Volledige productbeschrijving..."} />
              </div>

              {/* Gallery */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">{langTab === "nl" ? "Product Galerij" : "Product Gallery"}</label>
                <div className="flex flex-wrap gap-3">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`img-${idx}`} className={`w-20 h-20 object-cover rounded-lg border-2 cursor-pointer ${imageUrl === url ? "border-brand-gold" : "border-border-default"}`} onClick={() => setPrimary(url)} />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3 text-foreground" /></button>
                      {imageUrl === url && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-brand-gold bg-black/80 px-1 rounded">{langTab === "nl" ? "Hoofdafbeelding" : "Primary"}</span>}
                    </div>
                  ))}
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">{uploading ? "..." : (langTab === "nl" ? "Uploaden" : "Upload")}</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </div>
                <p className="text-[11px] text-gray-500 mt-2">Click an image to set as primary. Click &#x2715; to remove. Supported: JPG, PNG, WEBP.</p>
              </div>
            </div>
          </Section>

          {/* PRICING */}
          <Section title={langTab === "nl" ? "Prijzen" : "Pricing"}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{langTab === "nl" ? "Normale Prijs (&#x20AC;)" : "Regular Price (&#x20AC;)"}</label>
                <input type="text" inputMode="decimal" value={priceEur} onChange={(e) => setPriceEur(e.target.value)}
                  className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" placeholder="14,95" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{langTab === "nl" ? "Actie Prijs (&#x20AC;)" : "Sale Price (&#x20AC;)"}</label>
                <input type="text" inputMode="decimal" value={salePriceEur} onChange={(e) => setSalePriceEur(e.target.value)}
                  className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" placeholder="11,95" />
                {salePriceEur && inputToCents(salePriceEur) && inputToCents(priceEur) && inputToCents(salePriceEur)! >= inputToCents(priceEur)! ? (
                  <p className="text-xs text-red-400 mt-1">Sale price must be lower</p>
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{langTab === "nl" ? "Belastingklasse" : "Tax Class"}</label>
                <select value={taxClass} onChange={(e) => setTaxClass(e.target.value)} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500">
                  {TAX_CLASSES.map((tc) => <option key={tc.value} value={tc.value}>{tc.label}</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* VARIANTS */}
          <Section title={langTab === "nl" ? "Toppings" : "Toppings"}>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div
                  key={i}
                  draggable={editingVariantIdx !== i}
                  onDragStart={() => handleVariantDragStart(i)}
                  onDragOver={(e) => handleVariantDragOver(e, i)}
                  onDrop={handleVariantDrop}
                  className="flex items-center gap-2 bg-background border border-border-default rounded-lg px-3 py-2 cursor-move"
                >
                  <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                  {editingVariantIdx === i ? (
                    <>
                      <div className="flex-1 space-y-1">
                        <input type="text" value={editVariantName} onChange={(e) => setEditVariantName(e.target.value)} placeholder="EN name" className="w-full bg-white border border-border-default rounded px-2 py-1 text-sm" />
                        <input type="text" value={editVariantNameNl} onChange={(e) => setEditVariantNameNl(e.target.value)} placeholder="NL naam" className="w-full bg-white border border-border-default rounded px-2 py-1 text-sm" />
                      </div>
                      <input type="text" inputMode="decimal" value={editVariantPrice} onChange={(e) => setEditVariantPrice(e.target.value)} placeholder="Prijs" className="w-24 bg-white border border-border-default rounded px-2 py-1 text-sm" />
                      <button type="button" onClick={saveEditVariant} className="p-1 text-green-600 hover:text-green-700"><span className="text-xs font-bold">&#10003;</span></button>
                      <button type="button" onClick={cancelEditVariant} className="p-1 text-gray-500 hover:text-gray-700"><X className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-foreground flex-1">{displayName(v)}</span>
                      <span className="text-sm text-gray-400">{v.price ? `€ ${(v.price / 100).toFixed(2).replace(".", ",")}` : langTab === "nl" ? "Zelfde als basis" : "Same as base"}</span>
                      <button type="button" onClick={() => startEditVariant(i)} className="p-1 text-gray-500 hover:text-brand-gold"><Pencil className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => removeVariant(i)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              ))}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <input type="text" value={langTab === "en" ? newVariantName : newVariantNameNl} onChange={(e) => langTab === "en" ? setNewVariantName(e.target.value) : setNewVariantNameNl(e.target.value)} placeholder={langTab === "en" ? "Topping name (e.g. Extra Meat)" : "Topping naam (bijv. Extra Vlees)"} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariant(); } }} />
                  {langTab === "nl" && newVariantName.trim() && (
                    <p className="text-[11px] text-gray-500">EN name: {newVariantName}</p>
                  )}
                  {langTab === "en" && newVariantNameNl.trim() && (
                    <p className="text-[11px] text-gray-500">NL naam: {newVariantNameNl}</p>
                  )}
                </div>
                <input type="text" inputMode="decimal" value={newVariantPrice} onChange={(e) => setNewVariantPrice(e.target.value)} placeholder="Price (or empty)" className="w-32 bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariant(); } }} />
                <button type="button" onClick={addVariant} className="px-3 py-2 bg-brand-gold/20 text-brand-gold border border-brand-gold/30 rounded-lg text-sm font-medium hover:bg-brand-gold/30"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </Section>

          {/* MODIFIERS */}
          <Section title={langTab === "nl" ? "Extra's & Toevoegingen" : "Add-ons & Extras (Modifiers)"}>
            <div className="space-y-2">
              {modifiers.map((m, i) => (
                <div
                  key={i}
                  draggable={editingModifierIdx !== i}
                  onDragStart={() => handleModifierDragStart(i)}
                  onDragOver={(e) => handleModifierDragOver(e, i)}
                  onDrop={handleModifierDrop}
                  className="flex items-center gap-2 bg-background border border-border-default rounded-lg px-3 py-2 cursor-move"
                >
                  <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                  {editingModifierIdx === i ? (
                    <>
                      <div className="flex-1 space-y-1">
                        <input type="text" value={editModifierName} onChange={(e) => setEditModifierName(e.target.value)} placeholder="EN name" className="w-full bg-white border border-border-default rounded px-2 py-1 text-sm" />
                        <input type="text" value={editModifierNameNl} onChange={(e) => setEditModifierNameNl(e.target.value)} placeholder="NL naam" className="w-full bg-white border border-border-default rounded px-2 py-1 text-sm" />
                      </div>
                      <input type="text" inputMode="decimal" value={editModifierPrice} onChange={(e) => setEditModifierPrice(e.target.value)} placeholder="Prijs" className="w-24 bg-white border border-border-default rounded px-2 py-1 text-sm" />
                      <button type="button" onClick={saveEditModifier} className="p-1 text-green-600 hover:text-green-700"><span className="text-xs font-bold">&#10003;</span></button>
                      <button type="button" onClick={cancelEditModifier} className="p-1 text-gray-500 hover:text-gray-700"><X className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-foreground flex-1">{displayName(m)}</span>
                      <span className="text-sm text-gray-400">{m.price ? `+€ ${(m.price / 100).toFixed(2).replace(".", ",")}` : langTab === "nl" ? "Gratis" : "Free"}</span>
                      <button type="button" onClick={() => startEditModifier(i)} className="p-1 text-gray-500 hover:text-brand-gold"><Pencil className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => removeModifier(i)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              ))}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <input type="text" value={langTab === "en" ? newModifierName : newModifierNameNl} onChange={(e) => langTab === "en" ? setNewModifierName(e.target.value) : setNewModifierNameNl(e.target.value)} placeholder={langTab === "en" ? "Add-on name (e.g. Extra Pork)" : "Add-on naam (bijv. Extra Varkensvlees)"} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addModifier(); } }} />
                  {langTab === "nl" && newModifierName.trim() && (
                    <p className="text-[11px] text-gray-500">EN name: {newModifierName}</p>
                  )}
                  {langTab === "en" && newModifierNameNl.trim() && (
                    <p className="text-[11px] text-gray-500">NL naam: {newModifierNameNl}</p>
                  )}
                </div>
                <input type="text" inputMode="decimal" value={newModifierPrice} onChange={(e) => setNewModifierPrice(e.target.value)} placeholder="Extra cost" className="w-32 bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addModifier(); } }} />
                <button type="button" onClick={addModifier} className="px-3 py-2 bg-brand-gold/20 text-brand-gold border border-brand-gold/30 rounded-lg text-sm font-medium hover:bg-brand-gold/30"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </Section>

          {/* EXCLUSIONS (Customize Dish) */}
          <Section title={langTab === "nl" ? "Maak je gerechtje (uitsluitingen)" : "Customize Dish (Exclusions)"}>
            <ExclusionPanel
              menuItemId={editingItem?.id || ""}
              initialExclusions={exclusions}
              langTab={langTab}
            />
          </Section>

          {/* CATEGORIES */}
          <Section title={langTab === "nl" ? "Categorieën" : "Categories"}>
            <div className="flex items-center justify-between mb-2">
              {!showNewCat && <button type="button" onClick={() => setShowNewCat(true)} className="text-xs text-brand-gold hover:text-brand-gold/80 font-medium">{langTab === "nl" ? "+ Nieuwe categorie" : "+ New Category"}</button>}
            </div>
            {showNewCat && (
              <div className="flex gap-2 mb-3">
                <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder={langTab === "nl" ? "Categorie naam" : "Category name"} className="flex-1 bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCategory(); } }} />
                <button type="button" onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()} className="px-3 py-2 bg-brand-red text-foreground rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">{creatingCat ? "..." : (langTab === "nl" ? "Aanmaken" : "Create")}</button>
                <button type="button" onClick={() => { setShowNewCat(false); setNewCatName(""); }} className="px-3 py-2 text-gray-400 hover:text-foreground text-sm">{langTab === "nl" ? "Annuleren" : "Cancel"}</button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => <CheckCard key={c.id} label={c.name} checked={categoryIds.includes(c.id)} onChange={() => setCategoryIds((prev) => prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id])} />)}
            </div>
          </Section>

          {/* LOCATIONS */}
          <Section title={langTab === "nl" ? "Locaties" : "Locations"}>
            <div className="flex flex-wrap gap-2">
              {locations.map((l) => <CheckCard key={l.id} label={l.name} checked={locationIds.includes(l.id)} onChange={() => setLocationIds((prev) => prev.includes(l.id) ? prev.filter((id) => id !== l.id) : [...prev, l.id])} />)}
            </div>
          </Section>

          {/* PLASTIC SURCHARGE */}
          <Section title={langTab === "nl" ? "Plastic toeslag" : "Plastic surcharge"}>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                {langTab === "nl"
                  ? "Activeer per locatie een plastic toeslag voor dit product. Het bedrag wordt bij de productprijs opgeteld in de bestelomgeving."
                  : "Activate a plastic surcharge per location for this product. The amount is added to the product price in the ordering flow."}
              </p>
              <div className="space-y-2">
                {locations.map((location) => {
                  const surcharge = plasticSurchargeFor(location.id);
                  return (
                    <div key={location.id} className={`grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_160px] sm:items-center ${surcharge.isActive ? "border-brand-red bg-brand-red/10" : "border-border-default bg-background"}`}>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={surcharge.isActive}
                          onChange={(e) => updatePlasticSurcharge(location.id, { isActive: e.target.checked })}
                          className="w-4 h-4 rounded accent-brand-red"
                        />
                        <span className="text-sm font-medium text-foreground">{location.name}</span>
                      </label>
                      <div>
                        <label className="sr-only">
                          {langTab === "nl" ? `Plastic toeslag voor ${location.name}` : `Plastic surcharge for ${location.name}`}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={centsToInput(surcharge.amount)}
                          onChange={(e) => updatePlasticSurcharge(location.id, { amount: inputToCents(e.target.value) || 0 })}
                          placeholder="0,00"
                          className="w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-foreground focus:border-gray-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* DIETARY */}
          <Section title={langTab === "nl" ? "Dieet & Pittig" : "Dietary & Spicy"}>
            <div className="space-y-3">
              {/* List */}
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((opt) => (
                  <div key={opt.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${dietaryTags.includes(opt.slug) ? 'bg-brand-red/20 border-brand-red/40' : 'bg-background border-border-default'}`}>
                    <button type="button" onClick={() => setDietaryTags((prev) => prev.includes(opt.slug) ? prev.filter((v) => v !== opt.slug) : [...prev, opt.slug])} className="flex items-center gap-1.5 text-sm text-gray-200">
                      {opt.iconUrl ? (
                        <img src={opt.iconUrl} alt={opt.nameEn} className="w-4 h-4 object-contain"/>
                      ) : (
                        <div className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center">
                          <Upload className="w-2.5 h-2.5 text-gray-500"/>
                        </div>
                      )}
                      {langTab === "nl" ? opt.nameNl : opt.nameEn}
                    </button>
                    <button type="button" onClick={() => { setEditingDietaryId(opt.id); setEditDietaryEn(opt.nameEn); setEditDietaryNl(opt.nameNl); }} className="p-0.5 text-gray-500 hover:text-brand-gold" title="Edit names">
                      <Pencil className="w-3 h-3"/>
                    </button>
                    <button type="button" onClick={() => { setDietaryUploading(opt.id); dietaryFileRef.current?.click(); }} className="p-0.5 text-gray-500 hover:text-brand-gold" title="Upload icon">
                      <Upload className="w-3 h-3"/>
                    </button>
                  </div>
                ))}
<button type="button" onClick={async () => { const slug = prompt(langTab === "nl" ? "Slug (enkel woord, bv. vegan)" : "Slug (single word, e.g. vegan)"); if (!slug) return; const nameEn = prompt("English name") || slug; const nameNl = prompt("Dutch name") || nameEn; try { const r = await fetch("/api/admin/dietary-options", { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({slug, nameEn, nameNl}) }); if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error || `HTTP ${r.status}`); } const created = await r.json(); setDietaryOptions((prev) => [...prev, created]); } catch (err) { alert(langTab === "nl" ? "Aanmaken mislukt: " + (err instanceof Error ? err.message : "") : "Failed to create: " + (err instanceof Error ? err.message : "")); } }} className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-dashed border-gray-600 text-sm text-gray-400 hover:text-brand-gold hover:border-brand-gold/50">
                  <Plus className="w-3.5 h-3.5"/> {langTab === "nl" ? "Nieuwe optie" : "New option"}
                </button>
              </div>

              {/* Inline edit form */}
              {editingDietaryId && (
                <div className="bg-background border border-border-default rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-400">{langTab === "nl" ? "Namen bewerken" : "Edit names"}</p>
                  <div className="flex gap-2">
                    <input type="text" value={editDietaryEn} onChange={(e) => setEditDietaryEn(e.target.value)} placeholder="English name" className="flex-1 bg-white border border-border-default rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-gray-500"/>
                    <input type="text" value={editDietaryNl} onChange={(e) => setEditDietaryNl(e.target.value)} placeholder="Dutch name" className="flex-1 bg-white border border-border-default rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-gray-500"/>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingDietaryId(null)} className="px-3 py-1 rounded text-xs text-gray-400 border border-border-default hover:bg-gray-200">{langTab === "nl" ? "Annuleren" : "Cancel"}</button>
                    <button type="button" onClick={async () => { try { const r = await fetch(`/api/admin/dietary-options/${encodeURIComponent(editingDietaryId)}`, { method: "PATCH", credentials: "include", headers: {'Content-Type':'application/json'}, body: JSON.stringify({nameEn: editDietaryEn, nameNl: editDietaryNl}) }); if (check401(r)) return; if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error || `HTTP ${r.status}`); } setDietaryOptions((prev) => prev.map((o) => o.id === editingDietaryId ? { ...o, nameEn: editDietaryEn, nameNl: editDietaryNl } : o)); setEditingDietaryId(null); } catch (err) { alert(langTab === "nl" ? "Opslaan mislukt: " + (err instanceof Error ? err.message : "") : "Failed to save: " + (err instanceof Error ? err.message : "")); } }} className="px-3 py-1 rounded text-xs bg-brand-red text-foreground hover:bg-red-700">{langTab === "nl" ? "Opslaan" : "Save"}</button>
                  </div>
                </div>
              )}

              {/* Spicy toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={isSpicy} onChange={(e) => setIsSpicy(e.target.checked)} className="w-4 h-4 rounded accent-brand-red"/>
                <span className="text-sm text-gray-500">{langTab === "nl" ? "Pittig" : "Spicy"} <Flame className="w-3.5 h-3.5 text-orange-400 inline ml-1"/></span>
              </label>
            </div>
          </Section>

          {/* AVAILABILITY */}
          <Section title={langTab === "nl" ? "Beschikbaarheid & Volgorde" : "Availability & Sort"}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{langTab === "nl" ? "Sorteervolgorde" : "Sort Order"}</label>
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" />
              </div>
              <div className="flex flex-col gap-3 justify-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="w-4 h-4 rounded accent-brand-red" />
                  <span className="text-sm text-gray-500">{langTab === "nl" ? "Beschikbaar voor bestelling" : "Available for ordering"}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={isDineInOnly} onChange={(e) => setIsDineInOnly(e.target.checked)} className="w-4 h-4 rounded accent-brand-red" />
                  <span className="text-sm text-gray-500">{langTab === "nl" ? "Alleen Dine-In" : "Dine-In only"}</span>
                </label>
              </div>
            </div>
          </Section>

          {/* Hidden file input for dietary icon upload */}
          <input ref={dietaryFileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !dietaryUploading) return;
            const formData = new FormData();
            formData.append("file", file);
            try {
              const r = await fetch("/api/admin/upload", { method: "POST", credentials: "include", body: formData });
              if (!r.ok) throw new Error();
              const { url } = await r.json();
              const patchR = await fetch(`/api/admin/dietary-options/${encodeURIComponent(dietaryUploading)}`, { method: "PATCH", credentials: "include", headers: {'Content-Type':'application/json'}, body: JSON.stringify({iconUrl: url}) });
              if (!patchR.ok) throw new Error();
              setDietaryOptions((prev) => prev.map((o) => o.id === dietaryUploading ? { ...o, iconUrl: url } : o));
            } catch {
              alert("Icon upload failed");
            } finally {
              setDietaryUploading(null);
              if (dietaryFileRef.current) dietaryFileRef.current.value = "";
            }
          }} />

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-border-default hover:bg-gray-200 transition-colors">{langTab === "nl" ? "Annuleren" : "Cancel"}</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-red hover:bg-red-700 text-foreground transition-colors disabled:opacity-50">{saving ? "Saving..." : editingItem ? langTab === "nl" ? "Product Bijwerken" : "Update Product" : langTab === "nl" ? "Product Aanmaken" : "Create Product"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
