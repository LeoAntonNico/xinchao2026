import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.pickupSlot.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.location.deleteMany();

  console.log("Seeding locations...");
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
    },
  });

  console.log("Seeding categories...");
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
  const getCatId = (slug: string) => cats.find((c) => c.slug === slug)!.id;

  console.log("Seeding menu items...");
  const images = {
    phobo: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300&fit=crop",
    phoga: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop",
    buncha: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop",
    bunthit: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=300&fit=crop",
    comtam: "https://images.unsplash.com/photo-1604882355165-4450cb6155b2?w=400&h=300&fit=crop",
    comga: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop",
    goicuon: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=300&fit=crop",
    tra: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop",
    caphe: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?w=400&h=300&fit=crop",
  };

  await prisma.menuItem.createMany({
    data: [
      // Utrecht items
      { name: "Phở Bò", description: "Traditional beef noodle soup with herbs", price: 1395, imageUrl: images.phobo, categoryId: getCatId("pho"), locationId: utrecht.id, sortOrder: 1 },
      { name: "Phở Gà", description: "Chicken noodle soup with fresh herbs", price: 1295, imageUrl: images.phoga, categoryId: getCatId("pho"), locationId: utrecht.id, sortOrder: 2 },
      { name: "Bún Chả", description: "Grilled pork with vermicelli noodles", price: 1495, imageUrl: images.buncha, categoryId: getCatId("bun"), locationId: utrecht.id, sortOrder: 1 },
      { name: "Cơm Tấm", description: "Broken rice with grilled pork chop", price: 1345, imageUrl: images.comtam, categoryId: getCatId("com"), locationId: utrecht.id, sortOrder: 1 },
      { name: "Gỏi Cuốn", description: "Fresh spring rolls with shrimp and herbs", price: 795, imageUrl: images.goicuon, categoryId: getCatId("goi"), locationId: utrecht.id, sortOrder: 1 },
      { name: "Trà Đá", description: "Vietnamese iced tea", price: 295, imageUrl: images.tra, categoryId: getCatId("drinks"), locationId: utrecht.id, sortOrder: 1 },
      { name: "Cà Phê Sữa Đá", description: "Vietnamese iced coffee", price: 395, imageUrl: images.caphe, categoryId: getCatId("drinks"), locationId: utrecht.id, sortOrder: 2 },
      // Wageningen items
      { name: "Phở Bò", description: "Traditional beef noodle soup with herbs", price: 1395, imageUrl: images.phobo, categoryId: getCatId("pho"), locationId: wageningen.id, sortOrder: 1 },
      { name: "Bún Thịt Nướng", description: "Grilled pork with vermicelli and salad", price: 1445, imageUrl: images.bunthit, categoryId: getCatId("bun"), locationId: wageningen.id, sortOrder: 1 },
      { name: "Cơm Gà", description: "Chicken rice with ginger sauce", price: 1295, imageUrl: images.comga, categoryId: getCatId("com"), locationId: wageningen.id, sortOrder: 1 },
      { name: "Trà Đá", description: "Vietnamese iced tea", price: 295, imageUrl: images.tra, categoryId: getCatId("drinks"), locationId: wageningen.id, sortOrder: 1 },
    ],
  });

  console.log("Seeding pickup slots...");
  const today = new Date();
  for (let day = 1; day <= 7; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);
    const dateStr = date.toISOString().split("T")[0];

    const times = ["12:00", "12:30", "13:00", "13:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];
    for (const time of times) {
      await prisma.pickupSlot.create({
        data: {
          date: new Date(dateStr),
          time,
          capacity: 10,
          locationId: utrecht.id,
        },
      });
      await prisma.pickupSlot.create({
        data: {
          date: new Date(dateStr),
          time,
          capacity: 8,
          locationId: wageningen.id,
        },
      });
    }
  }

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
