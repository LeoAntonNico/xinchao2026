import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import Sidebar from "@/components/Sidebar";
import { CartProvider } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import CartButton from "@/components/CartButton";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Xin Chào | Vietnamese Restaurant",
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
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-background text-foreground">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <CartProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 p-4 md:p-8 lg:p-10">
                {children}
              </main>
            </div>
            <CartDrawer />
            <CartButton />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
