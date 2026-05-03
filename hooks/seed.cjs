// hooks/createSeed.cjs
require("dotenv").config({ path: ".env" });

async function seed() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  console.log("Connected to:", process.env.DATABASE_URL);

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
      phone: "+31 30 234 5678",
      email: "utrecht@xinchaorestaurant.nl",
      openTime: "12:00",
      closeTime: "21:30",
      capacity: 40,
    },
  });

  const wageningen = await prisma.location.create({
    data: {
      name: "Xin Chào Wageningen",
      slug: "wageningen",
      address: "Stationsstraat 32, 6701 AM Wageningen",
      phone: "+31 317 987 6543",
      email: "wageningen@xinchaorestaurant.nl",
      openTime: "12:00",
      closeTime: "20:30",
      capacity: 30,
    },
  });

  const cats = [];
  for (const [name, slug, sortOrder] of [
    ["Phở", "pho", 1],
    ["Bún", "bun", 2],
    ["Cơm", "com", 3],
    ["Gỏi", "goi", 4],
    ["Đồ uống", "drinks", 5],
  ]) {
    cats.push(await prisma.menuCategory.create({ data: { name, slug, sortOrder } }));
  }

  const getCat = (slug) => cats.find((c) => c.slug === slug).id;

  const items = [
    [