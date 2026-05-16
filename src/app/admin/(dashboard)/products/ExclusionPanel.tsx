"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Plus, Pencil, Check, GripVertical, Trash2 } from "lucide-react";

interface LocalExclusion {
  id: string;
  name: string;
  nameNl: string | null;
  sortOrder: number;
}

function centsToInput(cents: number | null) {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default function ExclusionPanel({
  menuItemId,
  initialExclusions,
  langTab,
}: {
  menuItemId: string;
  initialExclusions: LocalExclusion[];
  langTab: "en" | "nl";
}) {
  const [exclusions, setExclusions] = useState<LocalExclusion[]>(initialExclusions);
  const [newName, setNewName] = useState("");
  const [newNameNl, setNewNameNl] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync with parent when initialExclusions changes
  useEffect(() => {
    setExclusions(initialExclusions);
  }, [initialExclusions]);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/admin/exclusions?menuItemId=${menuItemId}`, { credentials: "include" });
    if (r.ok) setExclusions(await r.json());
  }, [menuItemId]);

  async function add() {
    const en = newName.trim();
    const nl = newNameNl.trim();
    if (!en && !nl) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/exclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ menuItemId, name: en || nl, nameNl: nl || null, sortOrder: exclusions.length }),
      });
      if (!r.ok) throw new Error();
      await refresh();
      setNewName(""); setNewNameNl("");
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    const r = await fetch(`/api/admin/exclusions/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) setExclusions((prev) => prev.filter((e) => e.id !== id));
  }

  // Edit state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editNameNl, setEditNameNl] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function startEdit(idx: number) {
    const e = exclusions[idx];
    setEditingIdx(idx);
    setEditName(e.name);
    setEditNameNl(e.nameNl || "");
  }

  async function saveEdit() {
    if (editingIdx === null) return;
    const e = exclusions[editingIdx];
    const name = editName.trim() || e.name;
    const nameNl = editNameNl.trim() || null;
    setExclusions((prev) => {
      const next = [...prev];
      next[editingIdx] = { ...next[editingIdx], name, nameNl };
      return next;
    });
    // Sync to backend
    await fetch(`/api/admin/exclusions/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, nameNl }),
    });
    setEditingIdx(null);
  }

  function cancelEdit() { setEditingIdx(null); }

  function handleDragStart(idx: number) { setDragIdx(idx); }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setExclusions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  }
  function handleDrop() {
    setDragIdx(null);
    // Sync sortOrder to backend after drag
    exclusions.forEach((e, idx) => {
      fetch(`/api/admin/exclusions/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sortOrder: idx }),
      });
    });
  }

  function displayName(e: LocalExclusion) {
    if (langTab === "nl" && e.nameNl) return e.nameNl;
    return e.name;
  }

  return (
    <div className="space-y-2">
      {exclusions.map((e, i) => (
        <div
          key={e.id}
          draggable={editingIdx !== i}
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={handleDrop}
          className="flex items-center gap-2 bg-background border border-border-default rounded-lg px-3 py-2 cursor-move"
        >
          <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
          {editingIdx === i ? (
            <>
              <div className="flex-1 space-y-1">
                <input type="text" value={editName} onChange={(ev) => setEditName(ev.target.value)} placeholder="EN name" className="w-full bg-white border border-border-default rounded px-2 py-1 text-sm" />
                <input type="text" value={editNameNl} onChange={(ev) => setEditNameNl(ev.target.value)} placeholder="NL naam" className="w-full bg-white border border-border-default rounded px-2 py-1 text-sm" />
              </div>
              <button type="button" onClick={saveEdit} className="p-1 text-green-600 hover:text-green-700"><span className="text-xs font-bold">&#10003;</span></button>
              <button type="button" onClick={cancelEdit} className="p-1 text-gray-500 hover:text-gray-700"><X className="w-3.5 h-3.5" /></button>
            </>
          ) : (
            <>
              <span className="text-sm text-foreground flex-1">{displayName(e)}</span>
              <button type="button" onClick={() => startEdit(i)} className="p-1 text-gray-500 hover:text-brand-gold"><Pencil className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => remove(e.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      ))}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={langTab === "en" ? "No cucumber" : "Geen komkommer"} className="w-full bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
          {newNameNl.trim() && <p className="text-[11px] text-gray-500">NL: {newNameNl}</p>}
        </div>
        <input type="text" value={newNameNl} onChange={(e) => setNewNameNl(e.target.value)} placeholder={langTab === "en" ? "NL optional" : "EN optioneel"} className="w-28 bg-background border border-border-default rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-gray-500" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" onClick={add} disabled={saving} className="px-3 py-2 bg-brand-red/20 text-brand-red border border-brand-red/30 rounded-lg text-sm font-medium hover:bg-brand-red/30 disabled:opacity-50"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
