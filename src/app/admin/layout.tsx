
import Link from "next/link";
import { Package, CalendarCheck, LayoutDashboard } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: Package },
    { href: "/admin/reservations", label: "Reservations", icon: CalendarCheck },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-sidebar border-b border-border-default px-6 py-3">
        <div className="flex items-center gap-6 max-w-7xl mx-auto">
          <Link href="/admin" className="font-bold text-brand-gold tracking-wider">
            XIN CHÀO ADMIN
          </Link>
          <div className="flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="flex-1" />
          <Link href="/en" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to site →
          </Link>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
}
