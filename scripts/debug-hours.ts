import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const locs = await prisma.location.findMany();
  for (const l of locs) {
    console.log("slug:", l.slug);
    console.log("openingHours raw:", l.openingHours);
    console.log("type:", typeof l.openingHours);
    if (l.openingHours && typeof l.openingHours === "object") {
      console.log("monday:", (l.openingHours as any)["monday"]);
    }
  }
  await prisma.$disconnect();
  await pool.end();
}

main();
