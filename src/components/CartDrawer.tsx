"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function CartDrawer() {
  const { items, updateQuantity, total, count } = useCart();
  const [open, setOpen] = useState(false);

  const formatPrice = (cents: number) =>
    `€${(cents / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-red text-white shadow-lg hover:bg-red-700 transition-colors"
      >
        <span className="text-lg">&#128722;</span>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-gold text-[10px] font-bold text-black">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-16 right-0 w-80 rounded-2xl border border-white/10 bg-sidebar p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Your Order</h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
              X
            </button>
          </div>

          {items.length === 0 && (
            <p className="text-sm text-gray-400 text-center">Cart is empty</p>
          )}
          {items.length > 0 && (
            <>
              <ul className="space-y-2 mb-4">
                {items.map((item) => (
                  <li key={item.menuItemId} className="flex items-start justify-between border-b border-white/5 pb-2">
                    <div>
                      <span className="text-sm font-medium text-white">{item.name}</span>
                      <p className="text-xs text-gray-500">{formatPrice(item.price)} ea</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-xs hover:bg-white/20"
                      >
                        +
                      </button>
                      <span className="text-sm text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-xs hover:bg-white/20"
                      >
                        -
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-white">{formatPrice(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between text-sm font-semibold text-white mb-3">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <a href="/order" className="block w-full rounded-lg bg-brand-red py-3 text-center text-sm font-semibold text-white hover:bg-red-700 transition-colors">
                  Checkout
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
