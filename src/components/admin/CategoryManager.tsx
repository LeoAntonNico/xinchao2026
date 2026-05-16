"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown, Plus, GripVertical, Trash2, Pencil, Check, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

interface CategoryManagerProps {
  categories: Category[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onCategoriesChange: (categories: Category[]) => void;
  onCategoryCreated?: (cat: Category) => void;
}

export default function CategoryManager({
  categories,
  selectedIds,
  onSelect,
  onCategoriesChange,
  onCategoryCreated,
}: CategoryManagerProps) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Drag state
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItem = useRef<string | null>(null);

  function toggleCategory(id: string) {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((s) => s !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  }

  async function handleAddCategory() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, sortOrder: categories.length }),
      });
      if (!res.ok) throw new Error("Failed");
      const cat = await res.json();
      onCategoriesChange([...categories, cat]);
      onCategoryCreated?.(cat);
      setNewName("");
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(cat: Category) {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === cat.name) {
      setEditingId(null);
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      onCategoriesChange(categories.map((c) => (c.id === updated.id ? updated : c)));
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${cat.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not delete");
        return;
      }
      const next = categories.filter((c) => c.id !== cat.id);
      onCategoriesChange(next);
      onSelect(selectedIds.filter((id) => id !== cat.id));
    } catch {
      alert("Failed to delete category");
    }
  }

  async function saveOrder(nextCats: Category[]) {
    onCategoriesChange(nextCats);
    try {
      await fetch("/api/admin/categories", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: nextCats.map((c) => c.id) }),
      });
    } catch (e) {
      console.error("Reorder failed", e);
    }
  }

  function moveItem(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    const list = [...categories];
    const dragIndex = list.findIndex((c) => c.id === dragId);
    const targetIndex = list.findIndex((c) => c.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;
    const [removed] = list.splice(dragIndex, 1);
    list.splice(targetIndex, 0, removed);
    saveOrder(list);
  }

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    dragItem.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    // Hide the default drag ghost by using a transparent image
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragItem.current && dragItem.current !== id) {
      setDragOverId(id);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault();
      setDragOverId(null);
      const dragId = dragItem.current;
      if (dragId && dragId !== id) {
        moveItem(dragId, id);
      }
      dragItem.current = null;
    },
    [categories]
  );

  const handleDragEnd = useCallback(() => {
    dragItem.current = null;
    setDragOverId(null);
  }, []);

  return (
    <div className="bg-white border border-border-default rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-bold text-foreground">Categories</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Add new */}
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="mt-3 text-[13px] font-medium text-brand-gold hover:text-brand-gold/80 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              New Category
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewName("");
                  }
                }}
                placeholder="Category name"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
              />
              <button
                onClick={handleAddCategory}
                disabled={saving || !newName.trim()}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewName("");
                }}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Category pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = selectedIds.includes(cat.id);
              const isDragOver = dragOverId === cat.id;
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  draggable={!isEditing}
                  onDragStart={(e) => handleDragStart(e, cat.id)}
                  onDragOver={(e) => handleDragOver(e, cat.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cat.id)}
                  onDragEnd={handleDragEnd}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-default transition-all ${
                    isDragOver
                      ? "border-brand-gold bg-brand-gold/10 scale-105"
                      : isSelected
                      ? "border-brand-red bg-brand-red/5 text-brand-red"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {/* Drag handle */}
                  <div
                    className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center justify-center w-4 h-4 rounded border transition-colors shrink-0 ${
                      isSelected
                        ? "bg-brand-red border-brand-red"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>

                  {/* Name / Edit input */}
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(cat);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="px-1.5 py-0.5 text-sm border border-gray-300 rounded w-28 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                      />
                      <button
                        onClick={() => handleRename(cat)}
                        disabled={editSaving}
                        className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => toggleCategory(cat.id)}
                      className="cursor-pointer select-none"
                    >
                      {cat.name}
                    </span>
                  )}

                  {/* Actions (visible on hover) */}
                  {!isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(cat.id);
                          setEditName(cat.name);
                        }}
                        className="p-0.5 text-gray-400 hover:text-brand-gold hover:bg-gray-100 rounded"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(cat);
                        }}
                        className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
