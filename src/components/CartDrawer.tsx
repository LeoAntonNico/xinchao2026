"use client";

import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { useCart } from "./CartContext";
import Link from "next/link";
import { useLocale } from "next-intl";

export default function CartDrawer() {
  const { items, total, isOpen, setIsOpen, updateQuantity, removeItem } = useCart();
  const locale = useLocale();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={() => setIsOpen(false)}
      />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border-default z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-gold" />
            Your Order
          </h2>
          <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Your cart is empty</p>
          ) : (
            items.map((item) => (
              <div key={item.menuItemId} className="flex items-center justify-between bg-sidebar rounded-lg p-3">
                <div>
                  <p className="font-medium text-white text-sm">{item.name}</p>
                  <p className="text-gray-400 text-sm">€{((item.price * item.quantity) / 100).toFixed(2).replace(".", ",")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                    className="w-7 h-7 rounded bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-white w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                    className="w-7 h-7 rounded bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-border-default space-y-3">
            <div className="flex justify-between text-white">
              <span className="font-medium">Total</span>
              <span className="font-bold text-brand-gold">€{(total / 100).toFixed(2).replace(".", ",")}</span>
            </div>
            <Link
              href={`/${locale}/order`}
              onClick={() => setIsOpen(false)}
              className="block w-full text-center py-3 bg-brand-red text-white rounded-lg font-medium hover:bg-[#a01830] transition-colors"
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
