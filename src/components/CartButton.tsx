"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartContext";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

export default function CartButton() {
  const { items, isOpen, setIsOpen } = useCart();
  const pathname = usePathname();
  const locale = useLocale();
  const isNl = locale === "nl";
  const count = items.reduce((s, i) => s + i.quantity, 0);
  if (pathname.includes("/admin") || pathname.includes("/checkout") || isOpen || count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className={[
        "fixed right-5 z-[180] flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-white shadow-[0_14px_34px_rgba(227,6,19,0.35)] transition hover:bg-logo-red-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red lg:bottom-6 lg:right-6",
        pathname.includes("/menu") ? "bottom-24 lg:bottom-6" : "bottom-5",
      ].join(" ")}
      aria-label={isNl ? `Open winkelwagen, ${count} items` : `Open cart, ${count} items`}
    >
      <div className="relative">
        <ShoppingBag className="h-6 w-6" aria-hidden="true" />
        <span className="absolute -right-3 -top-3 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-[#141414] px-1 text-[11px] font-extrabold leading-none text-white">
          {count}
        </span>
      </div>
    </button>
  );
}
