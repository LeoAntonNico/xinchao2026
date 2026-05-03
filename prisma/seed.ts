// prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.pickupSlot.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.location.deleteMany();

  // Create locations
  const utrecht = await prisma.location.create({
    data: {
      name: "Xin Chào Utrecht",
      slug: "utrecht",
      address: "Janskerkhof 15, 3512 BK Utrecht",
      phone: "+31 30 123 4567",
      email: "utrecht@xinchaorestaurant.nl",
      openTime: "12:00",
      closeTime: "21:30",
      capacity: 50,
      mapEmbedUrl: "https://maps.google.com/?q=Janskerkhof+15+Utrecht",
    },
  });

  const wageningen = await prisma.location.create({
    data: {
      name: "Xin Chào Wageningen",
      slug: "wageningen",
      address: "Stationsstraat 32, 6701 AM Wageningen",
      phone: "+31 317 765 4321",
      email: "wageningen@xinchaorestaurant.nl",
      openTime: "12:00",
      closeTime: "20:30",
      capacity: 35,
      mapEmbedUrl: "https://maps.google.com/?q=Stationsstraat+32+Wageningen",
    },
  });

  // Create categories
  const categories = [
    { name: "Phở", slug: "pho", sortOrder: 1 },
    { name: "Bún", slug: "bun", sortOrder: 2 },
    { name: "Cơm", slug: "com", sortOrder: 3 },
    { name: "Gỏi", slug: "goi", sortOrder: 4 },
    { name: "Đồ uống", slug: "drinks", sortOrder: 5 },
  ];

  for (const cat of categories) {
    await prisma.menuCategory.create({ data: cat });
  }

  const cats = await prisma.menuCategory.findMany();

  // Helper to get category id
  const getCatId = (slug: string) => cats.find((c) => c.slug === slug)!.id;

  // Menu items for Utrecht
  await prisma.menuItem.create({
    data: {
      name: "Phở Bò",
      description: "Traditional beef noodle soup with herbs",
      price: 1395,
      imageUrl: "https://images.unsplash.com/photo-1582878826629-65b9495f3ae8?w=400",
      categoryId: getCatId("pho"),
      locationId: utrecht.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Phở Gà",
      description: "Chicken noodle soup with fresh herbs",
      price: 1295,
      categoryId: getCatId("pho"),
      locationId: utrecht.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Bún Chả",
      description: "Grilled pork with vermicelli noodles",
      price: 1495,
      categoryId: getCatId("bun"),
      locationId: utrecht.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Cơm Tấm",
      description: "Broken rice with grilled pork chop",
      price: 1345,
      categoryId: getCatId("com"),
      locationId: utrecht.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Gỏi Cuốn",
      description: "Fresh spring rolls with shrimp and herbs",
      price: 895,
      categoryId: getCatId("goi"),
      locationId: utrecht.id,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Cà Phê Sữa Đá",
      description: "Vietnamese iced coffee with condensed milk",
      price: 495,
      categoryId: getCatId("drinks"),
      locationId: utrecht.id,
    },
  });

  // Menu items for Wageningen (same items)
  const wagItems = [
    { name: "Phở Bò", desc: "Traditional beef noodle soup", price: 1295, cat: "pho" },
    { name: "Phở Gà", desc: "Chicken noodle soup", price: 1195, cat: "pho" },
    { name: "Bún Chả", desc: "Grilled pork with vermicelli", price: 1395, cat: "bun" },
    { name: "Cơm Tấm", desc: "Broken rice with pork chop", price: 1245, cat: "com" },
    { name: "Gỏi Cuốn", desc: "Fresh spring rolls", price: 795, cat: "goi" },
    { name: "Trà Đào", desc: "Peach iced tea", price: 395, cat: "drinks" },
  ];

  for (const item of wagItems) {
    await prisma.menuItem.create({
      data: {
        name: item.name,
        description: item.desc,
        price: item.price,
        categoryId: getCatId(item.cat),
        locationId: wageningen.id,
      },
    });
  }

  // Generate pickup slots for next 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const locations = [utrecht, wageningen];
  for (const loc of locations) {
    const [openH, openM] = loc.openTime.split(":").map(Number);
    const [closeH, closeM] = loc.closeTime.split(":").map(Number);

    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);

      for (let h = openH; h <= closeH - 1; h++) {
        for (const m of [0, 30]) {
          if (h === closeH - 1 && m >= closeM) continue;

          const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          const exists = await prisma.pickupSlot.findUnique({
            where: { locationId_date_time: { locationId: loc.id, date, time: timeStr } },
          });

          if (!exists) {
            await prisma.pickupSlot.create({
              data: {
                date,
                time: timeStr,
                capacity: 10,
                locationId: loc.id,
              },
            });
          }
        }
      }
    }
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
