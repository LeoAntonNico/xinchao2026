"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  ShoppingBag,
  PackageCheck,
  Clock,
  XCircle,
  ChevronRight,
  Pencil,
  Save,
  LogOut,
  Loader2,
  AlertCircle,
  MapPin,
  CalendarClock,
} from "lucide-react";
import Image from "next/image";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  variantName: string | null;
  modifierNames: string[];
  exclusionNames: string[];
  menuItem: { name: string; nameNl: string | null; imageUrl: string | null };
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  location: { name: string };
  pickupSlot: { date: string; time: string };
  items: OrderItem[];
}

function fmtPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusIcon(status: string) {
  switch (status) {
    case "PAID":
    case "PREPARING":
    case "READY":
    case "COMPLETED":
      return <PackageCheck className="w-4 h-4 text-[#159947]" />;
    case "PENDING":
      return <Clock className="w-4 h-4 text-[#B99516]" />;
    default:
      return <XCircle className="w-4 h-4 text-[#737373]" />;
  }
}

function statusLabel(status: string, isNl: boolean) {
  const labels: Record<string, string> = {
    PENDING: isNl ? "In afwachting" : "Pending",
    PAID: isNl ? "Betaald" : "Paid",
    PREPARING: isNl ? "In bereiding" : "Preparing",
    READY: isNl ? "Klaar" : "Ready",
    COMPLETED: isNl ? "Afgerond" : "Completed",
    CANCELLED: isNl ? "Geannuleerd" : "Cancelled",
  };
  return labels[status] || status;
}

export default function MyAccountPage() {
  const locale = useLocale();
  const isNl = locale === "nl";
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("xinchao_token") : null;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError(isNl ? "Je bent niet ingelogd" : "You are not signed in");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/customer/me", { headers }).then((r) => r.json()),
      fetch("/api/customer/orders", { headers }).then((r) => r.json()),
    ])
      .then(([meData, ordersData]) => {
        if (meData.error) throw new Error(meData.error);
        if (ordersData.error) throw new Error(ordersData.error);
        setCustomer(meData);
        setOrders(ordersData || []);
        setEditName(meData.name || "");
        setEditPhone(meData.phone || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, isNl]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess(false);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editName) body.name = editName;
      if (editPhone) body.phone = editPhone;
      if (editPassword) body.password = editPassword;

      const res = await fetch("/api/customer/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setCustomer(data);
      setSaveSuccess(true);
      setEditPassword("");
      setEditing(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("xinchao_token");
    localStorage.removeItem("xinchao_customer");
    router.push(`/${locale}/order`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#737373]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        {isNl ? "Laden..." : "Loading..."}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#FAF7F1] px-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-16 h-16 bg-[#E31B23]/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-[#E31B23]" />
          </div>
          <p className="text-[#737373] text-sm">{error}</p>
          <button
            onClick={() => router.push(`/${locale}/checkout`)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E31B23] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#c4161d] transition-colors rounded-xl"
          >
            {isNl ? "Terug naar afrekenen" : "Back to checkout"}
          </button>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#FAF7F1] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href={`/${locale}/order`} className="inline-flex items-center gap-2 text-[#737373] text-sm hover:text-[#171717] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {isNl ? "Terug" : "Back"}
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#E31B23] transition-colors font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isNl ? "Uitloggen" : "Sign out"}
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E31B23]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#E31B23]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#171717]">{customer.name}</h1>
                <p className="text-xs text-[#737373]">{customer.email}</p>
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#737373] hover:text-[#171717] hover:border-[#171717] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                {isNl ? "Bewerk" : "Edit"}
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSaveProfile} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1.5">{isNl ? "Naam" : "Name"}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAF7F1] border border-[#E5E5E5] rounded-xl text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#E31B23]/20 focus:border-[#E31B23]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1.5">{isNl ? "Telefoon" : "Phone"}</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAF7F1] border border-[#E5E5E5] rounded-xl text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#E31B23]/20 focus:border-[#E31B23]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1.5">{isNl ? "Nieuw wachtwoord" : "New password"}</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder={isNl ? "Laat leeg om te behouden" : "Leave blank to keep current"}
                  className="w-full px-3 py-2.5 bg-[#FAF7F1] border border-[#E5E5E5] rounded-xl text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#E31B23]/20 focus:border-[#E31B23]"
                />
              </div>

              {saveError && <p className="text-xs text-[#E31B23]">{saveError}</p>}
              {saveSuccess && <p className="text-xs text-[#159947]">{isNl ? "Opgeslagen!" : "Saved!"}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E31B23] text-white text-xs font-bold tracking-widest uppercase rounded-xl hover:bg-[#c4161d] transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isNl ? "Opslaan" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setSaveError(""); setEditPassword(""); }}
                  className="px-4 py-2 border border-[#E5E5E5] text-[#737373] text-xs font-medium rounded-xl hover:text-[#171717] hover:border-[#171717] transition-colors"
                >
                  {isNl ? "Annuleren" : "Cancel"}
                </button>
              </div>
            </form>
          ) : (
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium">{isNl ? "Telefoon" : "Phone"}</p>
                <p className="text-sm text-[#171717] font-medium mt-0.5">{customer.phone}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-medium">Email</p>
                <p className="text-sm text-[#171717] font-medium mt-0.5">{customer.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Order History */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E5E5E5] flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-[#E31B23]" />
            <h2 className="text-base font-bold text-[#171717]">{isNl ? "Bestelgeschiedenis" : "Order History"}</h2>
            <span className="ml-auto text-xs text-[#737373] bg-[#F0EDE6] px-2 py-1 rounded-md font-medium">{orders.length}</span>
          </div>

          {orders.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-[#737373]">
                {isNl ? "Je hebt nog geen bestellingen geplaatst." : "You haven't placed any orders yet."}
              </p>
              <Link href={`/${locale}/order`} className="inline-block mt-3 text-sm text-[#E31B23] font-medium hover:underline">
                {isNl ? "Begin met bestellen" : "Start ordering"}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E5]">
              {orders.map((order) => (
                <div key={order.id} className="px-6 py-5 hover:bg-[#FAF7F1]/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#171717]">#{order.id.slice(-6).toUpperCase()}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F0EDE6] text-[#737373]">
                          {statusIcon(order.status)}
                          {statusLabel(order.status, isNl)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A3A3A3]">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className="text-sm font-bold text-[#171717]">{fmtPrice(order.totalAmount)}</span>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-[11px] text-[#737373] mb-3">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#B99516]" />
                      {order.location.name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="w-3 h-3 text-[#B99516]" />
                      {formatDate(order.pickupSlot.date)}, {order.pickupSlot.time}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#F0EDE6] shrink-0">
                          <Image
                            src={item.menuItem.imageUrl || "/images/placeholder-food.jpg"}
                            alt={isNl ? item.menuItem.nameNl || item.menuItem.name : item.menuItem.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#171717]">
                            {item.quantity}x {isNl ? item.menuItem.nameNl || item.menuItem.name : item.menuItem.name}
                          </p>
                          {item.variantName && (
                            <p className="text-[11px] text-[#737373]">{item.variantName}</p>
                          )}
                          {item.modifierNames?.length > 0 && (
                            <p className="text-[11px] text-[#737373]">{item.modifierNames.join(" + ")}</p>
                          )}
                          {item.exclusionNames?.length > 0 && (
                            <p className="text-[11px] text-[#B99516]">
                              {item.exclusionNames.map((e) => {
                                const label = e.trim().toUpperCase().startsWith("NO ") ? e.trim().substring(3) : e;
                                return `NO ${label}`;
                              }).join(", ")}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-[#171717] shrink-0">{fmtPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#E5E5E5] flex justify-end">
                    <Link
                      href={`/${locale}/order/confirmation?orderId=${order.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#E31B23] hover:underline"
                    >
                      {isNl ? "Bekijk details" : "View details"}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
