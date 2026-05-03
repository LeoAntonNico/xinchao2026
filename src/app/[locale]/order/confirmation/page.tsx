
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface OrderData {
  id: string;
  status: string;
  customerName: string;
  totalAmount: number;
  molliePaymentId: string | null;
  createdAt: string;
  items: { name: string; quantity: number; price: number }[];
  location: { name: string };
  pickupSlot: { date: string; time: string };
}

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
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

  const formatPrice = (cents: number) =>
    `€${(cents / 100).toFixed(2).replace(".", ",")}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading order status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Order Not Found</h1>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  const isPaid = order?.status === "PAID" || order?.status === "PAID";

  return (
    <div className="max-w-xl mx-auto space-y-8 text-center">
      {isPaid ? (
        <>
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>
          <p className="text-gray-400">
            Thank you, {order?.customerName}. Your order has been confirmed.
          </p>
        </>
      ) : (
        <>
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto" />
          <h1 className="text-3xl font-bold text-white">Payment Pending</h1>
          <p className="text-gray-400">
            We're waiting for payment confirmation. You can close this page, we'll send you an email when it's confirmed.
          </p>
        </>
      )}

      {order && (
        <div className="bg-sidebar border border-border-default rounded-xl p-6 text-left space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Order ID</span>
            <span className="text-white font-mono">{order.id.slice(0, 8)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Location</span>
            <span className="text-white">{order.location.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Pickup</span>
            <span className="text-white">{order.pickupSlot.date} at {order.pickupSlot.time}</span>
          </div>
          <div className="border-t border-border-default pt-3 space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-300">{item.name} × {item.quantity}</span>
                <span className="text-white">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border-default pt-3 flex justify-between">
            <span className="font-bold text-white">Total</span>
            <span className="font-bold text-brand-gold">{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
