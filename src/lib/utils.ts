import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Łączenie klas Tailwind (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Konwertuje kwotę w jednostkach głównych (PLN, np. "79,99") na grosze (Int). */
export function toMinor(value: string | number): number {
  const n =
    typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}

/** Grosze → string w jednostkach głównych (do pól formularza). */
export function toMajorString(minor: number): string {
  return (minor / 100).toFixed(2);
}

/**
 * Formatowanie kwot przechowywanych w groszach (Int) → string waluty.
 * Klient-safe (bez env). Domyślnie PLN/pl; wywołania zwykle podają walutę jawnie.
 */
export function formatMoney(
  amountMinor: number,
  currency = "PLN",
  locale = "pl",
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amountMinor / 100,
  );
}

/** Tworzy slug URL-friendly z tekstu (obsługa polskich znaków). */
export function slugify(input: string): string {
  const map: Record<string, string> = {
    ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ż: "z", ź: "z",
  };
  return input
    .toLowerCase()
    .replace(/[ąćęłńóśżź]/g, (c) => map[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
