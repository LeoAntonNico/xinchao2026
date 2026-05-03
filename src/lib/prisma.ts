import { PrismaClient as BasePrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: BasePrismaClient };

function createPrismaClient(): BasePrismaClient {
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  const adapter = new PrismaPg(pool);
  return new BasePrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") globalForPrisma.prisma = prisma;
