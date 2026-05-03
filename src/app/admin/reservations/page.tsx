
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/require-admin";

interface ReservationWithLocation {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  date: Date;
  time: string;
  partySize: number;
  location: { name: string };
}

export default async function AdminReservationsPage() {
  await requireAdminAuth();
  const reservations: ReservationWithLocation[] = await prisma.reservation.findMany({
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: { location: true },
    take: 50,
  });

  const statusStyles: Record<string, string> = {
    CONFIRMED: "bg-green-500/20 text-green-400",
    SEATED: "bg-blue-500/20 text-blue-400",
    CANCELLED: "bg-red-500/20 text-red-400",
    NO_SHOW: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Reservations</h1>
        <span className="text-sm text-gray-400">{reservations.length} reservations</span>
      </div>

      <div className="bg-sidebar border border-border-default rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Party</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {reservations.map((r) => (
              <tr key={r.id} className="hover:bg-gray-700/30">
                <td className="px-4 py-3 text-white">{r.customerName}</td>
                <td className="px-4 py-3 text-gray-300">{r.customerPhone}</td>
                <td className="px-4 py-3 text-gray-300">{r.location.name}</td>
                <td className="px-4 py-3 text-gray-300">{new Date(r.date).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3 text-gray-300">{r.time}</td>
                <td className="px-4 py-3 text-white font-medium">{r.partySize}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyles[r.status] || "bg-gray-500/20 text-gray-400"}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
