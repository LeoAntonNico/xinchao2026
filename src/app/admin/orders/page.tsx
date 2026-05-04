import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/require-admin";
import { OrderStatusCell } from "@/components/admin/OrderStatusCell";

interface OrderWithItems {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  createdAt: Date;
  location: { name: string };
  pickupSlot: { date: Date; time: string };
  items: { quantity: number; menuItem: { name: string } }[];
}

export default async function AdminOrdersPage() {
  await requireAdminAuth();
  const orders: OrderWithItems[] = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      location: true,
      pickupSlot: true,
      items: { include: { menuItem: true } },
    },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Orders</h1>
        <span className="text-sm text-gray-400">{orders.length} orders</span>
      </div>

      <div className="bg-sidebar border border-border-default rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Pickup</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-700/30">
                <td className="px-4 py-3 font-mono text-gray-400">{order.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-white">{order.customerName}</td>
                <td className="px-4 py-3 text-gray-300">{order.location.name}</td>
                <td className="px-4 py-3 text-gray-300">
                  {new Date(order.pickupSlot.date).toLocaleDateString("en-GB")} {order.pickupSlot.time}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(", ")}
                </td>
                <td className="px-4 py-3 text-white font-medium">
                  €{(order.totalAmount / 100).toFixed(2).replace(".", ",")}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusCell orderId={order.id} initialStatus={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
