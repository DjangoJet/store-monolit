import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seedowanie bazy...");

  // --- Admin ---
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Administrator",
      role: "ADMIN",
      passwordHash,
      emailVerified: new Date(),
    },
  });
  console.log(`  ✓ Admin: ${admin.email} (hasło: admin123)`);

  // --- Ustawienia sklepu ---
  const settings: Array<[string, unknown]> = [
    ["store.name", "Mój Sklep"],
    ["store.currency", "PLN"],
    ["store.locale", "pl"],
    ["tax.rate", 23],
  ];
  for (const [key, value] of settings) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });
  }
  console.log(`  ✓ Ustawienia (${settings.length})`);

  // --- Banner hero ---
  await prisma.banner.upsert({
    where: { key: "hero" },
    update: {},
    create: {
      key: "hero",
      title: "Witaj w sklepie",
      subtitle: "Szablon e-commerce gotowy do rozbudowy",
      isActive: true,
    },
  });

  // --- Strona CMS ---
  await prisma.page.upsert({
    where: { slug: "regulamin" },
    update: {},
    create: {
      slug: "regulamin",
      title: "Regulamin",
      body: "# Regulamin\n\nTreść do uzupełnienia.",
      status: "PUBLISHED",
    },
  });

  // --- Wysyłka: strefa Polska + metody ---
  const existingZone = await prisma.shippingZone.findFirst({
    where: { name: "Polska" },
  });
  if (!existingZone) {
    await prisma.shippingZone.create({
      data: {
        name: "Polska",
        countries: ["PL"],
        methods: {
          create: [
            {
              name: "Kurier",
              provider: "furgonetka",
              serviceCode: "dpd_courier",
              priceAmount: 1500,
              currency: "PLN",
              freeOver: 20000,
              minDays: 1,
              maxDays: 2,
            },
            {
              name: "Paczkomat InPost",
              provider: "furgonetka",
              serviceCode: "inpost_locker",
              requiresPickupPoint: true,
              priceAmount: 1200,
              currency: "PLN",
              minDays: 1,
              maxDays: 2,
            },
          ],
        },
      },
    });
    console.log("  ✓ Strefa wysyłki Polska + 2 metody");
  }

  // --- Katalog: brand, kategoria, produkt z wariantami ---
  const brand = await prisma.brand.upsert({
    where: { slug: "acme" },
    update: {},
    create: { slug: "acme", name: "Acme" },
  });

  const category = await prisma.category.upsert({
    where: { slug: "koszulki" },
    update: {},
    create: { slug: "koszulki", name: "Koszulki" },
  });

  const existingProduct = await prisma.product.findUnique({
    where: { slug: "koszulka-basic" },
  });

  if (!existingProduct) {
    const product = await prisma.product.create({
      data: {
        slug: "koszulka-basic",
        title: "Koszulka Basic",
        subtitle: "Bawełniana koszulka unisex",
        description: "Wygodna koszulka z bawełny organicznej.",
        status: "ACTIVE",
        type: "PHYSICAL",
        brandId: brand.id,
        categories: { create: { categoryId: category.id } },
        images: {
          create: { url: "https://placehold.co/600x600?text=Koszulka", position: 0 },
        },
        options: {
          create: {
            name: "Rozmiar",
            position: 0,
            values: {
              create: [
                { value: "S", position: 0 },
                { value: "M", position: 1 },
                { value: "L", position: 2 },
              ],
            },
          },
        },
      },
      include: { options: { include: { values: true } } },
    });

    const sizeValues = product.options[0].values;
    for (const [i, ov] of sizeValues.entries()) {
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          title: `Koszulka Basic / ${ov.value}`,
          sku: `KOSZ-BASIC-${ov.value}`,
          priceAmount: 7900,
          currency: "PLN",
          weightGrams: 200,
          position: i,
          optionValues: { create: { optionValueId: ov.id } },
          inventory: { create: { quantity: 50, trackInventory: true } },
        },
      });
      console.log(`  ✓ Wariant ${variant.sku}`);
    }
    console.log("  ✓ Produkt: Koszulka Basic (3 warianty)");
  }

  console.log("✅ Seed zakończony.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
