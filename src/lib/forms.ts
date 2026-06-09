import type { z } from "zod";

/**
 * Spłaszcza błędy Zod do mapy { nazwaPola: komunikat }, gdzie kluczem jest
 * ostatni segment ścieżki (np. `address.postalCode` -> `postalCode`).
 * Pasuje to 1:1 do atrybutów `name` w formularzu (są płaskie).
 * Wzorzec walidacji: patrz docs / checkout jako przykład referencyjny.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[issue.path.length - 1] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
