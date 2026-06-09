import { notFound } from "next/navigation";
import { features, type FeatureKey } from "@/lib/config";

/**
 * Twardo blokuje trasę, gdy moduł jest wyłączony flagą FEATURE_*.
 * Użyj w layout/page modułu, by wyłączona flaga dawała 404 (nie tylko ukrycie w UI).
 */
export function requireFeature(key: FeatureKey) {
  if (!features[key]) notFound();
}
