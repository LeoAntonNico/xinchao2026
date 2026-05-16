"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartContext";

export default function CartButton() {
  const { items, setIsOpen } = useCart();
  const count = items.reduce((s, i) => s + i.quantity, 0);
  if (items.length === 0) return null;

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="hidden lg:flex fixed bottom-6 right-6 z-50 p-3 bg-sidebar border border-border-default rounded-full text-foreground hover:bg-surface-container transition-colors shadow-lg"
      aria-label="Open cart"
    >
      <div className="relative">
        <ShoppingBag className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand-red text-white text-xs font-bold rounded-full flex items-center justify-center">
            {count}
          </span>
        )}
      </div>
    </button>
  );
}
