"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar, ChevronDown, Eye, MapPin, Package, RotateCcw, Search, Trash2, X } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface Order {
  id: string;
  orderNumber: string | null;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  totalAmount: number;
  createdAt: string;
  location: Location;
  pickupSlot: { date: string; time: string };
  items: { quantity: number; menuItem: { name: string } }[];
  molliePaymentId: string | null;
}

interface ReceiptPreview {
  orderId: string;
  text: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  PENDING: { label: "Pending", icon: null, color: "text-yellow-400", bg: "bg-yellow-500/15" },
  PAID: { label: "Paid", icon: null, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  PREPARING: { label: "Preparing", icon: null, color: "text-blue-400", bg: "bg-blue-500/15" },
  READY: { label: "Ready", icon: null, color: "text-brand-gold", bg: "bg-brand-gold/15" },
  COMPLETED: { label: "Completed", icon: null, color: "text-gray-400", bg: "bg-gray-500/15" },
  CANCELLED: { label: "Cancelled", icon: null, color: "text-red-400", bg: "bg-red-500/15" },
};

const statusOrder = ["PENDING", "PAID", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

function formatPrice(cents: number) {
  return `\u20AC ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function check401(response: Response) {
  if (response.status === 401) {
    window.location.href = "/admin/login";
    return true;
  }
  return false;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreview | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const [ordersResponse, locationsResponse] = await Promise.all([
      fetch("/api/admin/orders", { credentials: "include" }),
      fetch("/api/admin/locations", { credentials: "include" }),
    ]);
    if (check401(ordersResponse) || check401(locationsResponse)) return;
    if (ordersResponse.ok) {
      const data = await ordersResponse.json();
      setOrders(Array.isArray(data) ? data : []);
    }
    if (locationsResponse.ok) {
      const data = await locationsResponse.json();
      setLocations(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function advanceStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (check401(res)) return;
      if (res.ok) fetchOrders();
    } finally {
      setUpdatingId(null);
    }
  }

  async function viewReceipt(orderId: string) {
    setReceiptLoadingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/receipt`, { credentials: "include" });
      if (check401(res)) return;
      if (!res.ok) return;
      const data = await res.json();
      setReceiptPreview({ orderId: data.orderId, text: data.text });
    } finally {
      setReceiptLoadingId(null);
    }
  }

  async function removeOrder(order: Order) {
    const reference = order.orderNumber || order.id.slice(0, 8);
    if (!window.confirm(`Permanently remove order ${reference}? This cannot be undone.`)) {
      return;
    }

    setUpdatingId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (check401(res)) return;
      if (res.ok) {
        if (receiptPreview?.orderId === reference) setReceiptPreview(null);
        await fetchOrders();
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = statusOrder.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = useMemo(() => orders.filter((order) => {
    const q = search.trim().toLowerCase();
    const searchableText = `${order.customerName} ${order.customerPhone} ${order.customerEmail || ""}`.toLowerCase();
    const matchesSearch = !q || searchableText.includes(q);
    const matchesLocation = locationFilter === "ALL" || order.location.id === locationFilter;
    const matchesStatus = !activeFilter || order.status === activeFilter;
    const matchesDate = !dateFilter || order.pickupSlot.date.slice(0, 10) === dateFilter;
    return matchesSearch && matchesLocation && matchesStatus && matchesDate;
  }), [orders, search, locationFilter, activeFilter, dateFilter]);

  if (loading) return <div className="text-gray-400 p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Package className="w-6 h-6 text-brand-gold" />
          Orders
        </h1>
        <span className="text-sm text-gray-400">{orders.length} total</span>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {statusOrder.map((s) => {
          const cfg = statusConfig[s];
          return (
            <button
              key={s}
              onClick={() => setActiveFilter(activeFilter === s ? null : s)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeFilter === s ? "border-brand-gold/50 bg-brand-gold/5" : "border-border-default hover:bg-gray-50"
              }`}
            >
              <div className="text-xs text-gray-400 mb-1">{cfg.label}</div>
              <p className="text-2xl font-bold text-foreground">{counts[s] || 0}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone or email..."
            aria-label="Search orders"
            className="w-72 rounded-lg border border-[#DDD6CA] bg-white py-2 pl-9 pr-3 text-sm text-[#171717] placeholder-[#9CA3AF] focus:outline-none focus:border-[#B99516]"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <select
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            aria-label="Filter orders by location"
            className="min-w-52 appearance-none rounded-lg border border-[#DDD6CA] bg-white py-2 pl-9 pr-9 text-sm text-[#171717] focus:outline-none focus:border-[#B99516]"
          >
            <option value="ALL">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
        </div>
        <div className="relative">
          <select
            value={activeFilter || "ALL"}
            onChange={(event) => setActiveFilter(event.target.value === "ALL" ? null : event.target.value)}
            aria-label="Filter orders by status"
            className="appearance-none rounded-lg border border-[#DDD6CA] bg-white py-2 pl-3 pr-9 text-sm text-[#171717] focus:outline-none focus:border-[#B99516]"
          >
            <option value="ALL">All statuses</option>
            {statusOrder.map((status) => (
              <option key={status} value={status}>{statusConfig[status].label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            aria-label="Filter orders by pickup date"
            className="rounded-lg border border-[#DDD6CA] bg-white py-2 pl-9 pr-3 text-sm text-[#171717] focus:outline-none focus:border-[#B99516]"
          />
        </div>
      </div>

      <div className="bg-white border border-border-default rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Pickup</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => {
              const cfg = statusConfig[order.status] || statusConfig.PENDING;
              return (
                <tr key={order.id} className="border-b border-border-default last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-mono text-gray-500 text-xs">{order.orderNumber || order.id.slice(0, 8)}</div>
                    <div className="text-gray-500 text-xs">{order.location.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-foreground font-medium">{order.customerName}</div>
                    <div className="text-gray-500 text-xs">{order.customerPhone}</div>
                    {order.notes && <div className="text-brand-gold text-xs mt-0.5">{order.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-500">{new Date(order.pickupSlot.date).toLocaleDateString("nl-NL")}</div>
                    <div className="text-gray-500 text-xs">{order.pickupSlot.time}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-500 text-xs max-w-[200px] truncate">
                      {order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(", ")}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">{formatPrice(order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${cfg.bg} ${cfg.color} border-current/20`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => viewReceipt(order.id)}
                        disabled={receiptLoadingId === order.id}
                        title="View receipt"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-gray-600 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {receiptLoadingId === order.id ? "Loading" : "View receipt"}
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch("/api/print-queue", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ orderId: order.id, location: order.location.name.toLowerCase() }),
                          });
                          if (res.ok) fetchOrders();
                        }}
                        title="Print receipt"
                        className="px-2 py-1 rounded text-xs border border-gray-600 text-gray-500 hover:bg-gray-200 transition-colors"
                      >
                        Print
                      </button>
                      {order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
                        <button
                          onClick={() => advanceStatus(order.id, "CANCELLED")}
                          disabled={updatingId === order.id}
                          className="px-2 py-1 rounded text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                      {order.status === "CANCELLED" && (
                        <button
                          onClick={() => advanceStatus(order.id, "PENDING")}
                          disabled={updatingId === order.id}
                          className="p-1 text-gray-400 hover:text-foreground transition-colors disabled:opacity-50"
                          title="Restore"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeOrder(order)}
                        disabled={updatingId === order.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Remove order"
                        aria-label={`Remove order ${order.orderNumber || order.id.slice(0, 8)}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No orders found.</div>
        )}
      </div>

      {receiptPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-preview-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-border-default overflow-hidden">
            <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
              <div>
                <h2 id="receipt-preview-title" className="text-lg font-bold text-foreground">
                  Receipt preview
                </h2>
                <p className="text-xs text-gray-500 font-mono">{receiptPreview.orderId}</p>
              </div>
              <button
                onClick={() => setReceiptPreview(null)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-foreground transition-colors"
                aria-label="Close receipt preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[#f7f3ec] p-5">
              <pre className="mx-auto max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-sm bg-white px-4 py-5 font-mono text-[12px] leading-relaxed text-[#141414] shadow-sm border border-[#e8e4df]">
                {receiptPreview.text}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
