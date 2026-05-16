import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import LocationSelectorClient from "@/components/home/LocationSelectorClient";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isNl = locale === "nl";

  const locations = await prisma.location.findMany({ orderBy: { createdAt: "asc" } });

  const accentConfigs = [
    {
      text: "text-logo-red",
      bg: "bg-logo-red",
      border: "border-logo-red",
      soft: "bg-logo-red-soft",
      hover: "hover:bg-logo-red-hover",
    },
    {
      text: "text-logo-red",
      bg: "bg-logo-red",
      border: "border-logo-red",
      soft: "bg-logo-red-soft",
      hover: "hover:bg-logo-red-hover",
    },
  ];

  const districts = [
    isNl ? "Centrum" : "City Centre",
    isNl ? "Universiteitsstad" : "University Town",
  ];

  const descriptions = [
    isNl ? "Vietnamese street food in het hart van Utrecht." : "Vietnamese street food in the heart of Utrecht.",
    isNl ? "Vietnamese street food nabij Wageningen University." : "Vietnamese street food near Wageningen University.",
  ];

  const images = ["/images/utrecht-exterior.jpg", "/images/wageningen-exterior.jpg"];

  // Serialize location data for the client component
  const locationData = locations.map((loc, i) => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
    district: districts[i],
    description: descriptions[i],
    address: loc.address,
    phone: loc.phone,
    accent: accentConfigs[i],
    hours: (loc.openingHours as Array<{ day: string; hours: string }>) || [],
    mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(loc.address)}`,
    imageSrc: images[i],
  }));

  return (
    <LocationSelectorClient
      locationData={locationData}
      locale={locale}
      isNl={isNl}
    />
  );
}
