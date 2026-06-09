import { requireRole } from "@/server/session";
import { Button } from "@/components/ui/button";
import {
  availableShippingProviders,
  listProviderServices,
  listZonesWithMethods,
} from "@/modules/shipping/service";
import { deleteZoneAction } from "@/modules/shipping/actions";
import { MethodForm, MethodRow, ZoneForm } from "./shipping-forms";

export default async function AdminShippingPage() {
  await requireRole("STAFF");

  const providers = availableShippingProviders();
  // Usługi Furgonetki (gdy skonfigurowana) — do wyboru w formularzu metody.
  const services = providers.includes("furgonetka")
    ? await listProviderServices("furgonetka")
    : [];
  const zones = await listZonesWithMethods();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Wysyłka</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Strefy i metody wysyłki. Cena dla klienta jest stała; przy metodzie integrowanej
          (np. Furgonetka) wskazujesz usługę, którą kupisz etykietę przy realizacji zamówienia.
        </p>
      </div>

      <ZoneForm />

      {zones.length === 0 && (
        <p className="text-sm text-muted-foreground">Brak stref — dodaj pierwszą powyżej.</p>
      )}

      <div className="space-y-6">
        {zones.map((zone) => (
          <section key={zone.id} className="space-y-4 rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-medium">{zone.name}</h2>
                <p className="text-xs text-muted-foreground">
                  Kraje: {(zone.countries as string[]).join(", ") || "—"}
                </p>
              </div>
              <form action={deleteZoneAction}>
                <input type="hidden" name="id" value={zone.id} />
                <Button type="submit" variant="outline" size="sm">
                  Usuń strefę
                </Button>
              </form>
            </div>

            {zone.methods.length > 0 ? (
              <ul className="divide-y rounded-md border text-sm">
                {zone.methods.map((m) => (
                  <MethodRow key={m.id} method={m} providers={providers} services={services} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Brak metod w tej strefie.</p>
            )}

            <MethodForm zoneId={zone.id} providers={providers} services={services} />
          </section>
        ))}
      </div>
    </div>
  );
}
