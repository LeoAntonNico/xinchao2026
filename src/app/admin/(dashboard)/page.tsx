
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Package, CalendarCheck } from "lucide-react";
import { requireAdminAuth } from "@/lib/require-admin";

export default async function AdminPage() {
  await requireAdminAuth();

  const orderCount = await prisma.order.count();
  const reservationCount = await prisma.reservation.count();
  const menuItemCount = await prisma.menuItem.count();
  const locationCount = await prisma.location.count();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = await prisma.order.count({
    where: { createdAt: { gte: today } },
  });
  const todayReservations = await prisma.reservation.count({
    where: { date: today },
  });

  const cards = [
    { label: "Today's Orders", value: todayOrders, icon: Package, href: "/admin/orders", color: "text-brand-red" },
    { label: "Today's Reservations", value: todayReservations, icon: CalendarCheck, href: "/admin/reservations", color: "text-brand-gold" },
    { label: "Total Orders", value: orderCount, icon: Package, href: "/admin/orders", color: "text-gray-400" },
    { label: "Total Reservations", value: reservationCount, icon: CalendarCheck, href: "/admin/reservations", color: "text-gray-400" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="block bg-white border border-border-default rounded-xl p-5 hover:border-gray-500 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-sm text-gray-400 mt-1">{card.label}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
