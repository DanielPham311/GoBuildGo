import { PrismaClient } from "@prisma/client";
import { seedComponents } from "./components";
import { seedThemes } from "./themes";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");
  await seedComponents(prisma);
  await seedThemes(prisma);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
