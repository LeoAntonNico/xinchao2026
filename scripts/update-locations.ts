import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const utrechtHours = {
  monday:    { open: "12:00", close: "20:00" },
  tuesday:   { open: "12:00", close: "20:00" },
  wednesday: { open: "12:00", close: "20:00" },
  thursday:  { open: "12:00", close: "20:00" },
  friday:    { open: "12:00", close: "20:00" },
  saturday:  { open: "12:00", close: "20:00" },
  sunday:    { open: "14:00", close: "20:00" },
};

const wagenHours = {
  monday:    { open: "12:00", close: "19:30" },
  tuesday:   { open: "12:00", close: "19:30" },
  wednesday: { open: "12:00", close: "19:30" },
  thursday:  { open: "12:00", close: "19:30" },
  friday:    { open: "12:00", close: "19:30" },
  saturday:  { open: "12:00", close: "19:30" },
  sunday:    { open: "14:00", close: "19:30" },
};

async function main() {
  await prisma.location.update({ where: { slug: "utrecht" }, data: {
    openingHours: utrechtHours,
    welcomeTextNl: "Welkom bij Vietnamees Restaurant Xin Chao Utrecht",
    welcomeTextEn: "Welcome to Vietnamese Restaurant Xin Chao Utrecht",
  }});

  await prisma.location.update({ where: { slug: "wageningen" }, data: {
    openingHours: wagenHours,
    welcomeTextNl: "Welkom bij Vietnamees Restaurant Xin Chao Wageningen",
    welcomeTextEn: "Welcome to Vietnamese Restaurant Xin Chao Wageningen",
  }});

  console.log("Updated locations");
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
