"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Clock, ChefHat, CheckCircle2, Ban, RotateCcw } from "lucide-react";

interface Order {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  totalAmount: number;
  createdAt: string;
  location: { name: string };
  pickupSlot: { date: string; time: string };
  items: { quantity: number; menuItem: { name: string } }[];
  molliePaymentId: string | null;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; next: string | null }> = {
  PENDING: { label: "Pending", icon: null, color: "text-yellow-400", bg: "bg-yellow-500/15", next: "PAID" },
  PAID: { label: "Paid", icon: null, color: "text-emerald-400", bg: "bg-emerald-500/15", next: "PREPARING" },
  PREPARING: { label: "Preparing", icon: null, color: "text-blue-400", bg: "bg-blue-500/15", next: "READY" },
  READY: { label: "Ready", icon: null, color: "text-brand-gold", bg: "bg-brand-gold/15", next: "COMPLETED" },
  COMPLETED: { label: "Completed", icon: null, color: "text-gray-400", bg: "bg-gray-500/15", next: null },
  CANCELLED: { label: "Cancelled", icon: null, color: "text-red-400", bg: "bg-red-500/15", next: null },
};

const statusOrder = ["PENDING", "PAID", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

function formatPrice(cents: number) {
  return `E$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
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
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/admin/orders", { credentials: "include" });
    if (check401(res)) return;
    if (res.ok) {
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
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

  const counts = statusOrder.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = activeFilter ? orders.filter((o) => o.status === activeFilter) : orders;

  if (loading) return <div className="text-gray-400 p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
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
                activeFilter === s ? "border-brand-gold/50 bg-brand-gold/5" : "border-border-default hover:bg-white/5"
              }`}
            >
              <div className="text-xs text-gray-400 mb-1">{cfg.label}</div>
              <p className="text-2xl font-bold text-white">{counts[s] || 0}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-sidebar border border-border-default rounded-xl overflow-hidden">
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
                <tr key={order.id} className="border-b border-border-default last:border-0 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-mono text-gray-400 text-xs">{order.id.slice(0, 8)}</div>
                    <div className="text-gray-500 text-xs">{order.location.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{order.customerName}</div>
                    <div className="text-gray-500 text-xs">{order.customerPhone}</div>
                    {order.notes && <div className="text-brand-gold text-xs mt-0.5">{order.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-300">{new Date(order.pickupSlot.date).toLocaleDateString("nl-NL")}</div>
                    <div className="text-gray-500 text-xs">{order.pickupSlot.time}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-300 text-xs max-w-[200px] truncate">
                      {order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(", ")}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{formatPrice(order.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${cfg.bg} ${cfg.color} border-current/20`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {cfg.next && (
                        <button
                          onClick={() => advanceStatus(order.id, cfg.next!)}
                          disabled={updatingId === order.id}
                          className="px-2 py-1 rounded text-xs bg-brand-red hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                        >
                          {`> ${statusConfig[cfg.next].label}`}
                        </button>
                      )}
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
                          className="p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                          title="Restore"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
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
    </div>
  );
}
