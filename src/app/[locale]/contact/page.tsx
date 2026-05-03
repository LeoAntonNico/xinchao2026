
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function ContactPage() {
  const locations = await prisma.location.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Contact</h1>
        <p className="text-gray-400">Visit us or get in touch</p>
      </div>

      <div className="space-y-6">
        {locations.map((loc) => (
          <div key={loc.id} className="bg-sidebar border border-border-default rounded-xl p-6">
            <h2 className="text-xl font-bold text-brand-gold mb-4">{loc.name}</h2>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-brand-red mt-0.5 shrink-0" />
                <span>{loc.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-brand-red shrink-0" />
                <span>{loc.phone}</span>
              </div>
              {loc.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-brand-red shrink-0" />
                  <span>{loc.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-brand-red shrink-0" />
                <span>{loc.openTime} – {loc.closeTime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
