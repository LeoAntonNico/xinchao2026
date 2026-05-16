"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Bookmark,
  MapPin,
  CalendarClock,
  User,
  CreditCard,
  ArrowLeft,
  Lock,
} from "lucide-react";
import Image from "next/image";

interface OrderData {
  id: string;
  status: string;
  customerName: string;
  totalAmount: number;
  molliePaymentId: string | null;
  createdAt: string;
  items: {
    name: string;
    shortDescription: string | null;
    shortDescriptionNl: string | null;
    quantity: number;
    price: number;
    imageUrl?: string | null;
    imageUrls?: string[];
    variantName: string | null;
    modifierNames: string[];
    exclusionNames: string[];
  }[];
  location: { name: string };
  pickupSlot: { date: string; time: string };
}

function formatOrderId(order: OrderData) {
  const d = new Date(order.createdAt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const shortId = order.id.slice(-4).toUpperCase();
  return `XC-${yyyy}-${mm}${dd}-${shortId}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function getItemImage(item: OrderData["items"][0]) {
  if (item.imageUrl) return item.imageUrl;
  if (item.imageUrls && item.imageUrls.length > 0) return item.imageUrls[0];
  return "/images/placeholder-food.jpg";
}

function getItemDescription(item: OrderData["items"][0], isNl: boolean) {
  const desc = isNl ? item.shortDescriptionNl : item.shortDescription;
  return desc || "";
}

function getAdditions(item: OrderData["items"][0]) {
  const parts: string[] = [];
  if (item.variantName) parts.push(item.variantName);
  if (item.modifierNames && item.modifierNames.length > 0) {
    parts.push(...item.modifierNames);
  }
  return parts;
}

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const isNl = locale === "nl";
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      setError("No order ID found");
      setLoading(false);
      return;
    }
    fetch(`/api/order-status?orderId=${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setOrder(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#737373]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading order status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-[#E31B23] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[#171717] mb-2">Order Not Found</h1>
        <p className="text-[#737373]">{error}</p>
      </div>
    );
  }

  const isPaid = order?.status === "PAID";
  const isPending = order?.status === "PENDING";

  const total = order?.totalAmount ?? 0;
  const subtotal = Math.round(total / 1.09);
  const tax = total - subtotal;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#FAF7F1] py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Celebration Header */}
        <div className="text-center space-y-3 relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span className="absolute top-2 left-[20%] w-2 h-2 rounded-full bg-[#159947] opacity-60" />
            <span className="absolute top-6 right-[25%] w-1.5 h-1.5 rounded-full bg-[#B99516] opacity-60" />
            <span className="absolute top-0 left-[60%] w-1.5 h-1.5 rounded-full bg-[#159947] opacity-40" />
            <span className="absolute top-4 right-[10%] w-2 h-2 rounded-full bg-[#B99516] opacity-40" />
            <span className="absolute top-1 left-[40%] w-1 h-1 rounded-full bg-[#159947] opacity-50" />
          </div>

          <div className="relative w-20 h-20 bg-[#159947]/15 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-[#159947]" strokeWidth={2.5} />
          </div>

          <h1 className="text-3xl font-bold text-[#171717] tracking-tight">
            {isPaid ? "Order Confirmed" : isPending ? "Payment Pending" : "Order Status"}
          </h1>
          <p className="text-[#737373] text-sm max-w-sm mx-auto leading-relaxed">
            {isPaid
              ? `Thank you, ${order?.customerName}. Your order has been received and is confirmed.`
              : `We're waiting for payment confirmation. You can close this page, we'll send you an email when it's confirmed.`}
          </p>
        </div>

        {/* Order Details Card */}
        {order && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E5] overflow-hidden">

            {/* Meta Row */}
            <div className="px-6 py-5 border-b border-[#E5E5E5]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <MetaItem
                  icon={<Bookmark className="w-3.5 h-3.5" />}
                  label="Order ID"
                  value={formatOrderId(order)}
                />
                <MetaItem
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  label="Location"
                  value={order.location.name}
                />
                <MetaItem
                  icon={<CalendarClock className="w-3.5 h-3.5" />}
                  label="Pickup"
                  value={`${formatDate(order.pickupSlot.date)}, ${order.pickupSlot.time}`}
                />
                <MetaItem
                  icon={<User className="w-3.5 h-3.5" />}
                  label="Customer"
                  value={order.customerName}
                />
                <MetaItem
                  icon={<CreditCard className="w-3.5 h-3.5" />}
                  label="Payment Method"
                  value={isPaid ? "iDEAL" : "Pending"}
                />
              </div>
            </div>

            {/* Items Section */}
            <div className="px-6 py-5 border-b border-[#E5E5E5]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#171717] text-sm tracking-wide uppercase">Your Order</h3>
                <span className="text-xs font-medium text-[#737373] uppercase tracking-wide">Price</span>
              </div>

              <div className="space-y-5">
                {order.items.map((item, i) => {
                  const additions = getAdditions(item);
                  const description = getItemDescription(item, isNl);
                  return (
                    <div key={i} className="flex items-start gap-4">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#F0EDE6] shrink-0">
                        <Image
                          src={getItemImage(item)}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="font-semibold text-[#171717] text-sm">{item.name}</p>
                        <p className="text-xs text-[#737373]">{item.quantity}x</p>
                        {description && (
                          <p className="text-[11px] text-[#737373] uppercase tracking-wide">
                            {description}
                          </p>
                        )}
                        {additions.length > 0 && (
                          <p className="text-[11px] text-[#737373] uppercase tracking-wide">
                            {additions.join(" + ")}
                          </p>
                        )}
                        {item.exclusionNames && item.exclusionNames.length > 0 && (
                          <p className="text-[11px] text-[#B99516] uppercase tracking-wide">
                            {item.exclusionNames.map(e => {
                              const label = e.trim().toUpperCase().startsWith("NO ") ? e.trim().substring(3) : e;
                              return `NO ${label}`;
                            }).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-[#171717] shrink-0 pt-0.5">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="px-6 py-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#737373]">Subtotal</span>
                <span className="text-[#171717] font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#737373]">Tax (9%)</span>
                <span className="text-[#171717] font-medium">{formatPrice(tax)}</span>
              </div>
              <div className="border-t border-[#E5E5E5] pt-3 mt-3 flex justify-between">
                <span className="font-bold text-[#171717]">Total</span>
                <span className="font-bold text-[#B99516] text-lg">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => router.push("/en/order")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#E5E5E5] rounded-xl text-[#171717] font-medium text-sm hover:bg-[#F5F5F0] transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </button>
        </div>

        {/* Security Footer */}
        <div className="bg-[#F0EDE6] rounded-xl px-5 py-4 flex items-start gap-3">
          <Lock className="w-4 h-4 text-[#B99516] shrink-0 mt-0.5" />
          <p className="text-xs text-[#737373] leading-relaxed">
            Your data and payment are secure with us. See our{" "}
            <a href="/en/privacy" className="text-[#159947] font-medium hover:underline">
              privacy policy
            </a>{" "}
            for more information.
          </p>
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-[#B99516] mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium leading-tight">
          {label}
        </p>
        <p className="text-xs font-semibold text-[#171717] truncate leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}
