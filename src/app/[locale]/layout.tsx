import type { Metadata } from "next";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import Sidebar from "@/components/Sidebar";
import { CartProvider } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import CartButton from "@/components/CartButton";

export const metadata: Metadata = {
  title: "Xin Chào | Vietnamese Street Food",
  description: "Authentic Vietnamese cuisine with locations in Utrecht and Wageningen",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <CartProvider>
        <div className="flex min-h-screen bg-background text-foreground">
          <Sidebar />
          <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
        <CartDrawer />
        <CartButton />
      </CartProvider>
    </NextIntlClientProvider>
  );
}
