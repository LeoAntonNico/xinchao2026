"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "./CartContext";
import { formatCartChoices } from "@/lib/cart-display";

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function getCopy(locale: string) {
  const isNl = locale === "nl";
  return {
    addMore: isNl ? "Meer items toevoegen" : "Add more items",
    checkout: isNl ? "Afrekenen" : "Checkout",
    closeCart: isNl ? "Sluit winkelwagen" : "Close cart",
    decrease: isNl ? "Aantal verlagen" : "Decrease quantity",
    emptyCart: isNl ? "Je winkelwagen is leeg" : "Your cart is empty",
    emptyHint: isNl ? "Voeg je favoriete Vietnamese streetfood toe." : "Add your favorite Vietnamese street food.",
    increase: isNl ? "Aantal verhogen" : "Increase quantity",
    lineSubtotal: isNl ? "Regeltotaal" : "Line subtotal",
    remove: isNl ? "Verwijderen" : "Remove",
    subtotal: isNl ? "Subtotaal" : "Subtotal",
    total: "Totaal",
    yourOrder: isNl ? "Je bestelling" : "Your order",
  };
}

function cartLineKey(item: {
  cartItemKey?: string;
  menuItemId: string;
  variantId?: string;
  modifierIds?: string[];
  exclusionIds?: string[];
}) {
  if (item.cartItemKey) return item.cartItemKey;
  const modifiers = [...(item.modifierIds || [])].sort().join(",");
  const exclusions = [...(item.exclusionIds || [])].sort().join(",");
  return `${item.menuItemId}:${item.variantId || ""}:${modifiers}:${exclusions}`;
}

export default function CartDrawer() {
  const { items, total, isOpen, setIsOpen, updateQuantity, removeItem } = useCart();
  const locale = useLocale();
  const copy = getCopy(locale);
  const cartQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const menuHref = `/${locale}/menu`;
  const checkoutHref = `/${locale}/checkout`;

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[190] cursor-default bg-black/35"
        onClick={() => setIsOpen(false)}
        aria-label={copy.closeCart}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[200] flex w-full max-w-[440px] flex-col border-l border-[#E8E4DF] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
        aria-label={copy.yourOrder}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#E8E4DF] px-5 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E30613]">
              {cartQuantity} {cartQuantity === 1 ? "item" : "items"}
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-light uppercase text-[#141414]">
              <ShoppingBag className="h-5 w-5 text-[#E30613]" aria-hidden="true" />
              {copy.yourOrder}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E4DF] text-[#6B6B6B] transition hover:border-[#E30613] hover:text-[#E30613] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
            aria-label={copy.closeCart}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {items.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF4F4] text-[#E30613]">
                <ShoppingBag className="h-9 w-9" aria-hidden="true" />
              </div>
              <p className="mt-5 text-lg font-extrabold text-[#141414]">{copy.emptyCart}</p>
              <p className="mt-2 max-w-[240px] text-sm leading-6 text-[#6B6B6B]">{copy.emptyHint}</p>
              <Link
                href={menuHref}
                onClick={() => setIsOpen(false)}
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#E30613] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#C90511] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
              >
                {copy.addMore}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const key = cartLineKey(item);
                const choices = formatCartChoices(item);
                const imageSrc = item.imageUrl || "/images/hero-pho.jpg";

                return (
                  <li key={key} className="border-b border-[#E8E4DF] pb-4">
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
                      <div className="relative h-[72px] overflow-hidden rounded-xl bg-[#EFEAE3]">
                        <Image
                          src={imageSrc}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="72px"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold uppercase text-[#141414]">{item.name}</p>
                            {choices && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7E7770]">{choices}</p>}
                            <p className="mt-1 text-xs text-[#6B6B6B]">
                              {formatPrice(item.price)} <span className="text-[#A8A1A0]">/ item</span>
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-extrabold text-[#141414]">{formatPrice(item.price * item.quantity)}</p>
                            <p className="sr-only">{copy.lineSubtotal}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="inline-flex h-10 items-center rounded-lg border border-[#E8E4DF] bg-white">
                            <button
                              type="button"
                              onClick={() => updateQuantity(key, item.quantity - 1)}
                              className="flex h-10 w-10 items-center justify-center text-[#6B6B6B] transition hover:text-[#E30613] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
                              aria-label={`${copy.decrease}: ${item.name}`}
                            >
                              <Minus className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <span className="w-10 text-center text-sm font-extrabold text-[#141414]" aria-live="polite">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(key, item.quantity + 1)}
                              className="flex h-10 w-10 items-center justify-center text-[#6B6B6B] transition hover:text-[#E30613] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
                              aria-label={`${copy.increase}: ${item.name}`}
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(key)}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-bold uppercase tracking-wide text-[#E30613] transition hover:bg-[#FFF4F4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            {copy.remove}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-[#E8E4DF] bg-white px-5 py-5">
            <div className="mb-4 flex items-center justify-between text-sm text-[#6B6B6B]">
              <span>{copy.subtotal}</span>
              <span className="font-bold text-[#141414]">{formatPrice(total)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <Link
                href={menuHref}
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#E8E4DF] px-4 py-3 text-sm font-extrabold text-[#141414] transition hover:border-[#E30613] hover:text-[#E30613] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
              >
                {copy.addMore}
              </Link>
              <Link
                href={checkoutHref}
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#E30613] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#C90511] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E30613]"
              >
                {copy.checkout} · {formatPrice(total)}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </footer>
        )}
      </aside>
    </>
  );
}
