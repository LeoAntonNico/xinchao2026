"use client";

import CartDrawer from "@/components/CartDrawer";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CartDrawer />
    </>
  );
}
