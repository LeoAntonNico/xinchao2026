// prisma/seed.cjs
require("dotenv").config();

const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env["DATABASE_URL"];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.$executeRaw`DELETE FROM "OrderItem"`;
  await prisma.$executeRaw`DELETE FROM "Order"`;
  await prisma.$executeRaw`DELETE FROM "Reservation"`;
  await prisma.$executeRaw`DELETE FROM "PickupSlot"`;
  await prisma.$executeRaw`DELETE FROM "MenuItem"`;
  await prisma.$executeRaw`DELETE FROM "MenuCategory"`;
  await prisma.$executeRaw`DELETE FROM "Location"`;

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

  const catsData = [
    { name: "Phở", slug: "pho", sortOrder: 1 },
    { name: "Bún", slug: "bun", sortOrder: 2 },
    { name: "Cơm", slug: "com", sortOrder: 3 },
    { name: "Gỏi", slug: "goi", sortOrder: 4 },
    { name: "Đồ uống", slug: "drinks", sortOrder: 5 },
  ];
  for (const c of catsData) await prisma.menuCategory.create({ data: c });

  const cats = await prisma.menuCategory.findMany();
  const getCatId = (slug) => cats.find((c) => c.slug === slug).id;

  const utrechtItems = [
    { name: "Phở Bò", desc: "Traditional beef noodle soup with herbs", price: 1395, cat: "pho" },
    { name: "Phở Gà", desc: "Chicken noodle soup with fresh herbs", price: 1295, cat: "pho" },
    { name: "Bún Chả", desc: "Grilled pork with vermicelli noodles", price: 1495, cat: "bun" },
    { name: "Cơm Tấm", desc: "Broken rice with grilled pork chop", price: 1345, cat: "com" },
    { name: "Gỏi Cuốn", desc: "Fresh spring rolls with shrimp and herbs", price: 895, cat: "goi" },
    { name: "Cà Phê Sữa Đá", desc: "Vietnamese iced coffee with condensed milk", price: 495, cat: "drinks" },
  ];

  for (const item of utrechtItems) {
    await prisma.menuItem.create({
      data: {
        name: item.name,
        description: item.desc,
        price: item.price,
        categoryId: getCatId(item.cat),
        locationId: utrecht.id,
      },
    });
  }

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const loc of [utrecht, wageningen]) {
    const [openH, openM] = loc.openTime.split(":").map(Number);
    const [closeH, closeM] = loc.closeTime.split(":").map(Number);
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      for (let h = openH; h <= closeH - 1; h++) {
        for (const m of [0, 30]) {
          if (h === closeH - 1 && m >= closeM) continue;
          const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          await prisma.pickupSlot.create({
            data: { date, time: timeStr, capacity: 10, locationId: loc.id },
          });
        }
      }
    }
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => pool.end());
