"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";

interface PickupPoint {
  code: string;
  name: string;
  carrier: string;
  address: string;
  lat?: number;
  lng?: number;
}

/**
 * Uniwersalny wybór punktu odbioru — niezależny od przewoźnika. Pobiera punkty z
 * `/api/shipping/points` (adapter aktywnego przewoźnika), pokazuje je na mapie
 * (Leaflet/OSM, bez kluczy API) i na liście, a kod zapisuje do pola `pickupPointCode`.
 * Gdy przewoźnik nie zwraca punktów (np. manual) — działa jak zwykłe pole na kod.
 */
export function PickupPointPicker({
  methodId,
  error,
}: {
  methodId: string;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<PickupPoint | null>(null);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/shipping/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodId, query: query.trim() }),
      });
      const data = (await res.json()) as { points?: PickupPoint[] };
      setResults(data.points ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function choose(p: PickupPoint) {
    setSelected(p);
    setCode(p.code);
  }

  const hasCoords = results.some((p) => p.lat != null && p.lng != null);

  // Render mapy: leniwy import Leaflet (client-only), markery klikalne = wybór punktu.
  useEffect(() => {
    const withCoords = results.filter((p) => p.lat != null && p.lng != null);
    if (withCoords.length === 0) {
      try {
        mapRef.current?.remove();
      } catch {
        /* kontener mógł już zniknąć */
      }
      mapRef.current = null;
      layerRef.current = null;
      return;
    }
    if (!mapDivRef.current) return;

    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapDivRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(mapDivRef.current).setView([52.07, 19.48], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }

      const layer = layerRef.current!;
      layer.clearLayers();
      const bounds: [number, number][] = [];
      for (const p of withCoords) {
        const isSel = p.code === code;
        L.circleMarker([p.lat!, p.lng!], {
          radius: isSel ? 9 : 6,
          color: isSel ? "#16a34a" : "#2563eb",
          fillColor: isSel ? "#16a34a" : "#3b82f6",
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindTooltip(p.name)
          .on("click", () => choose(p))
          .addTo(layer);
        bounds.push([p.lat!, p.lng!]);
      }
      mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      mapRef.current.invalidateSize();
    })();

    return () => {
      cancelled = true;
    };
  }, [results, code]);

  // Sprzątanie mapy przy odmontowaniu komponentu.
  useEffect(() => {
    return () => {
      try {
        mapRef.current?.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="pickupPointCode">Punkt odbioru *</Label>

      {/* Wyszukiwarka punktów */}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kod pocztowy lub miasto"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={() => void search()} disabled={loading}>
          {loading ? "Szukam..." : "Szukaj"}
        </Button>
      </div>

      {hasCoords && (
        <div
          ref={mapDivRef}
          className="h-72 w-full overflow-hidden rounded-md border"
          aria-label="Mapa punktów odbioru"
        />
      )}

      {results.length > 0 && (
        <ul className="max-h-56 divide-y overflow-auto rounded-md border text-sm">
          {results.map((p) => {
            const isSel = p.code === code;
            return (
              <li key={`${p.carrier}-${p.code}`}>
                <button
                  type="button"
                  onClick={() => choose(p)}
                  className={`block w-full px-3 py-2 text-left hover:bg-accent ${
                    isSel ? "bg-accent" : ""
                  }`}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-2 text-xs uppercase text-muted-foreground">{p.carrier}</span>
                  {p.address && (
                    <span className="block text-xs text-muted-foreground">{p.address}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Brak punktów dla zapytania — możesz wpisać kod punktu ręcznie poniżej.
        </p>
      )}

      {selected && (
        <p className="text-xs text-green-700">
          Wybrano: <span className="font-medium">{selected.name}</span> ({selected.code})
        </p>
      )}

      {/* Źródło prawdy — kod punktu. Wypełniany wyborem z mapy/listy lub ręcznie. */}
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
    </div>
  );
}
