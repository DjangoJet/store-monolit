import "dotenv/config";
import { FurgonetkaClient } from "../src/modules/shipping/providers/furgonetka/client";

async function main() {
  const client = new FurgonetkaClient({
    clientId: process.env.FURGONETKA_CLIENT_ID!,
    clientSecret: process.env.FURGONETKA_CLIENT_SECRET!,
    username: process.env.FURGONETKA_USERNAME!,
    password: process.env.FURGONETKA_PASSWORD!,
    sandbox: String(process.env.FURGONETKA_SANDBOX) === "true",
  });

  const services = await client.getServices();
  if (!services.length) {
    console.log("Brak usług na koncie (sprawdź zaakceptowane regulaminy / aktywne usługi).");
    return;
  }
  console.log(`Dostępne usługi (${services.length}):\n`);
  for (const s of services) {
    console.log(`  id=${s.id}\tservice=${s.service}\tname=${s.name}`);
  }
}

main().catch((e) => {
  console.error("Błąd:", e instanceof Error ? e.message : e);
  process.exit(1);
});
