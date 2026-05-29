"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "xinchao_selected_location";

export function getStoredSelectedLocationId(validIds?: string[]) {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (validIds && !validIds.includes(raw)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function setStoredSelectedLocationId(id: string) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearStoredSelectedLocationId() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function useSelectedLocation(validIds?: string[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = getStoredSelectedLocationId(validIds);
    if (raw) setSelectedId(raw);
    setHydrated(true);
  }, [validIds]);

  const selectLocation = useCallback((id: string) => {
    setSelectedId(id);
    setStoredSelectedLocationId(id);
  }, []);

  const clearLocation = useCallback(() => {
    setSelectedId(null);
    clearStoredSelectedLocationId();
  }, []);

  return { selectedId, selectLocation, clearLocation, hydrated };
}
