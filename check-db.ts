import { prisma } from "./src/lib/prisma";

async function main() {
  const cats = await prisma.menuCategory.findMany({
    include: { items: { include: { locations: true } } }
  });
  for (const c of cats) {
    console.log(`Category: ${c.name} (${c.items.length} items)`);
    for (const i of c.items) {
      console.log(`  - ${i.name} | available=${i.isAvailable} | locations=${i.locations.map((l: { name: string }) => l.name).join(", ")}`);
    }
  }
}
main().then(() => process.exit(0));
