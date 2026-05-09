import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const locs = await prisma.location.findMany();
  for (const l of locs) {
    console.log(l.slug, "hours:", JSON.stringify(l.openingHours));
  }
  await prisma.$disconnect();
  await pool.end();
}

main();
