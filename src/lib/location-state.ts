"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "xinchao_selected_location";

export function useSelectedLocation(validIds?: string[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Validate: if validIds provided and stored ID not in list, clear it
        if (validIds && !validIds.includes(raw)) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setSelectedId(raw);
        }
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, [validIds]);

  const selectLocation = useCallback((id: string) => {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch { /* ignore */ }
  }, []);

  const clearLocation = useCallback(() => {
    setSelectedId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  return { selectedId, selectLocation, clearLocation, hydrated };
}
