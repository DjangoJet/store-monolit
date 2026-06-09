"use client";

import { useState } from "react";
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
 * `/api/shipping/points` (adapter aktywnego przewoźnika) i wpisuje kod do pola
 * `pickupPointCode`. Gdy przewoźnik nie zwraca punktów (np. manual) — działa jako
 * zwykłe pole na kod (fallback).
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
    setResults([]);
    setSearched(false);
  }

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

      {results.length > 0 && (
        <ul className="max-h-56 divide-y overflow-auto rounded-md border text-sm">
          {results.map((p) => (
            <li key={`${p.carrier}-${p.code}`}>
              <button
                type="button"
                onClick={() => choose(p)}
                className="block w-full px-3 py-2 text-left hover:bg-accent"
              >
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-xs uppercase text-muted-foreground">{p.carrier}</span>
                {p.address && <span className="block text-xs text-muted-foreground">{p.address}</span>}
              </button>
            </li>
          ))}
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

      {/* Źródło prawdy — kod punktu. Wypełniany wyborem z listy lub ręcznie. */}
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
