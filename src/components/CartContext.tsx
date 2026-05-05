"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  variantId?: string;
  variantName?: string;
  modifierIds?: string[];
  modifierNames?: string[];
}

interface AddItemPayload {
  menuItemId: string;
  name: string;
  price: number;
  variantId?: string;
  variantName?: string;
  modifierIds?: string[];
  modifierNames?: string[];
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

const CartContext = createContext<CartContextValue | null>(null);

function itemKey(it: { menuItemId: string; variantId?: string; modifierIds?: string[] }) {
  const mods = (it.modifierIds || []).sort().join(",");
  return `${it.menuItemId}:${it.variantId || ""}:${mods}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((newItem: AddItemPayload) => {
    setItems((prev) => {
      const key = itemKey(newItem);
      const existing = prev.find((i) => itemKey(i) === key);
      if (existing) {
        return prev.map((i) => itemKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  }, []);

  const decreaseItem = useCallback((menuItemId: string) => {
    setItems((prev) => {
      const allForProduct = prev.filter((i) => i.menuItemId === menuItemId);
      if (allForProduct.length === 0) return prev;
      const last = allForProduct[allForProduct.length - 1];
      if (last.quantity === 1) return prev.filter((i) => itemKey(i) !== itemKey(last));
      return prev.map((i) => itemKey(i) === itemKey(last) ? { ...i, quantity: i.quantity - 1 } : i);
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i)));
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
