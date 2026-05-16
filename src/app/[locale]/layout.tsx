import type { Metadata } from "next";
import { Anton, Be_Vietnam_Pro, Space_Grotesk, Geist_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import Sidebar from "@/components/Sidebar";
import { CartProvider } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import CartButton from "@/components/CartButton";

const anton = Anton({ weight: "400", variable: "--font-anton", subsets: ["latin"] });
const beVietnam = Be_Vietnam_Pro({ weight: ["400", "500", "700"], variable: "--font-be-vietnam", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ weight: ["400", "500", "700"], variable: "--font-space-grotesk", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
    <html lang={locale} className={`${anton.variable} ${beVietnam.variable} ${spaceGrotesk.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <CartProvider>
            <div className="flex min-h-screen">
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
      </body>
    </html>
  );
}
