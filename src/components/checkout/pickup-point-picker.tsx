"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";

// Klucz API Mapy Furgonetki — publiczny (ograniczony domenowo w panelu Furgonetki).
const MAP_KEY = process.env.NEXT_PUBLIC_FURGONETKA_MAP_KEY;

interface FurgonetkaPoint {
  code: string;
  name: string;
  type: string;
  country_code?: string;
  cod?: boolean;
  furgonetka_point?: boolean;
}

interface FurgonetkaMapConfig {
  apiKey: string;
  courierServices?: string[];
  callback: (params: { point: FurgonetkaPoint }) => void;
}

declare global {
  interface Window {
    Furgonetka?: { Map: new (cfg: FurgonetkaMapConfig) => { show: () => void } };
  }
}

// Ładowanie skryptu widgetu raz, z oczekiwaniem aż window.Furgonetka będzie gotowe.
let scriptPromise: Promise<void> | null = null;
function loadMapScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("brak window"));
  if (window.Furgonetka?.Map) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://furgonetka.pl/js/dist/map/map.js";
    s.async = true;
    s.onload = () => {
      const start = Date.now();
      const wait = () => {
        if (window.Furgonetka?.Map) resolve();
        else if (Date.now() - start > 5000) reject(new Error("Furgonetka.Map niedostępne"));
        else setTimeout(wait, 50);
      };
      wait();
    };
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Nie udało się wczytać skryptu mapy"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Wybór punktu odbioru. Dla przewoźnika integrowanego (Furgonetka) otwiera
 * oficjalny widget mapy (klucz API ograniczony domenowo), filtrowany po przewoźniku
 * metody. Pole na kod jest źródłem prawdy i działa też jako fallback (ręczny wpis),
 * gdy widget nie jest skonfigurowany lub przewoźnik nie jest znany.
 */
export function PickupPointPicker({
  carrier,
  error,
}: {
  carrier: string | null;
  error?: string;
}) {
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<FurgonetkaPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const widgetAvailable = !!MAP_KEY && !!carrier;

  async function openMap() {
    if (!MAP_KEY || !carrier) return;
    setLoading(true);
    setLoadError(null);
    try {
      await loadMapScript();
      new window.Furgonetka!.Map({
        apiKey: MAP_KEY,
        courierServices: [carrier],
        callback: ({ point }) => {
          setSelected(point);
          setCode(point.code);
        },
      }).show();
    } catch {
      setLoadError("Nie udało się otworzyć mapy — wpisz kod punktu ręcznie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="pickupPointCode">Punkt odbioru *</Label>

      {widgetAvailable && (
        <Button type="button" variant="outline" onClick={() => void openMap()} disabled={loading}>
          {loading ? "Otwieram mapę..." : "Wybierz punkt na mapie"}
        </Button>
      )}

      {loadError && <p className="text-xs text-destructive">{loadError}</p>}

      {selected && (
        <p className="text-xs text-green-700">
          Wybrano: <span className="font-medium">{selected.name}</span> ({selected.code})
        </p>
      )}

      {/* Źródło prawdy — kod punktu. Wypełniany z mapy lub ręcznie. */}
      <Input
        id="pickupPointCode"
        name="pickupPointCode"
        placeholder="np. WAW01A"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setSelected(null);
        }}
        aria-invalid={!!error}
        required
      />
      <FieldError message={error} />

      {!widgetAvailable && (
        <p className="text-xs text-muted-foreground">Wpisz kod punktu odbioru.</p>
      )}
    </div>
  );
}
