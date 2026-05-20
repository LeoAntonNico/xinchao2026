"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

interface CartItem {
  cartItemKey?: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  variantId?: string;
  variantName?: string;
  modifierIds?: string[];
  modifierNames?: string[];
  exclusionIds?: string[];
  exclusionNames?: string[];
}

interface AddItemPayload {
  menuItemId: string;
  name: string;
  price: number;
  imageUrl?: string;
  variantId?: string;
  variantName?: string;
  modifierIds?: string[];
  modifierNames?: string[];
  exclusionIds?: string[];
  exclusionNames?: string[];
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: AddItemPayload) => void;
  removeItem: (menuItemId: string) => void;
  decreaseItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CART_KEY = "xinchao_cart";
const CartContext = createContext<CartContextValue | null>(null);
const FALLBACK_IMAGE = "/images/hero-pho.jpg";

function itemKey(it: { menuItemId: string; variantId?: string; modifierIds?: string[]; exclusionIds?: string[] }) {
  const mods = [...(it.modifierIds || [])].sort().join(",");
  const excl = [...(it.exclusionIds || [])].sort().join(",");
  return `${it.menuItemId}:${it.variantId || ""}:${mods}:${excl}`;
}

function cartItemKey(item: CartItem) {
  return item.cartItemKey || itemKey(item);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const hasRestoredCart = useRef(false);

  /* ── hydrate from localStorage on mount ── */
  /* ── persist to localStorage on every change ── */
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(CART_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CartItem[];
          setItems(parsed.map((item) => ({ ...item, cartItemKey: cartItemKey(item) })));
        }
      } catch {
        // Ignore corrupt cart storage and let the shopper continue with a clean cart.
      } finally {
        hasRestoredCart.current = true;
      }
    });
  }, []);

  useEffect(() => {
    if (!hasRestoredCart.current) return;
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!hasRestoredCart.current || items.length === 0 || items.every((item) => item.imageUrl)) return;

    let cancelled = false;
    fetch("/api/menu-images")
      .then((response) => response.ok ? response.json() : [])
      .then((images: Array<{ id: string; imageUrl: string | null }>) => {
        if (cancelled || images.length === 0) return;
        const imageMap = new Map(images.map((item) => [item.id, item.imageUrl || FALLBACK_IMAGE]));
        setItems((current) =>
          current.map((item) => (
            item.imageUrl
              ? item
              : { ...item, imageUrl: imageMap.get(item.menuItemId) || FALLBACK_IMAGE }
          ))
        );
      })
      .catch(() => {
        if (cancelled) return;
        setItems((current) =>
          current.map((item) => item.imageUrl ? item : { ...item, imageUrl: FALLBACK_IMAGE })
        );
      });

    return () => {
      cancelled = true;
    };
  }, [items]);

  const addItem = useCallback((newItem: AddItemPayload) => {
    setItems((prev) => {
      const key = itemKey(newItem);
      const existing = prev.find((i) => cartItemKey(i) === key);
      if (existing) {
        return prev.map((i) => cartItemKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...newItem, cartItemKey: key, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((keyOrMenuItemId: string) => {
    setItems((prev) => {
      const hasExactMatch = prev.some((item) => cartItemKey(item) === keyOrMenuItemId);
      return prev.filter((item) => hasExactMatch ? cartItemKey(item) !== keyOrMenuItemId : item.menuItemId !== keyOrMenuItemId);
    });
  }, []);

  const decreaseItem = useCallback((keyOrMenuItemId: string) => {
    setItems((prev) => {
      const exactItem = prev.find((item) => cartItemKey(item) === keyOrMenuItemId);
      const fallbackItem = prev.filter((item) => item.menuItemId === keyOrMenuItemId).at(-1);
      const itemToDecrease = exactItem ?? fallbackItem;
      if (!itemToDecrease) return prev;
      const key = cartItemKey(itemToDecrease);
      if (itemToDecrease.quantity === 1) return prev.filter((item) => cartItemKey(item) !== key);
      return prev.map((item) => cartItemKey(item) === key ? { ...item, quantity: item.quantity - 1 } : item);
    });
  }, []);

  const updateQuantity = useCallback((keyOrMenuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(keyOrMenuItemId);
      return;
    }
    setItems((prev) => {
      const hasExactMatch = prev.some((item) => cartItemKey(item) === keyOrMenuItemId);
      return prev.map((item) => {
        const isMatch = hasExactMatch ? cartItemKey(item) === keyOrMenuItemId : item.menuItemId === keyOrMenuItemId;
        return isMatch ? { ...item, quantity } : item;
      });
    });
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, decreaseItem, updateQuantity, clearCart, total, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
