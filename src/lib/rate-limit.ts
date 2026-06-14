import { headers } from "next/headers";

/**
 * Prosty rate limiter w pamięci procesu (sliding window). Wystarcza dla monolitu
 * w pojedynczej instancji; przy skalowaniu poziomym podmień na wspólny magazyn
 * (np. Redis) — kontrakt funkcji pozostaje ten sam.
 */
const hits = new Map<string, number[]>();

const PRUNE_INTERVAL_MS = 60_000;
let lastPrune = Date.now();

function prune(now: number) {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, times] of hits) {
    const recent = times.filter((t) => now - t < 60 * 60 * 1000);
    if (recent.length === 0) hits.delete(key);
    else hits.set(key, recent);
  }
}

/** Zwraca true, gdy wywołanie mieści się w limicie `limit` zdarzeń na `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  prune(now);

  const times = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    hits.set(key, times);
    return false;
  }
  times.push(now);
  hits.set(key, times);
  return true;
}

/** IP klienta z nagłówków proxy (do kluczy rate limitu; "unknown" gdy brak). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
