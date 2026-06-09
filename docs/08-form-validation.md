# 08 — Walidacja formularzy

Wzorzec walidacji w `store-monolit`. Trzy warstwy, jedno źródło prawdy.
Działa identycznie w storefroncie i panelu admina.

## Zasada

Walidacja jest **serwerowa** (Zod w Server Action) — to granica bezpieczeństwa,
niezależna od UI. Formularz tylko **wyświetla** błędy zwrócone przez akcję.
Dzięki temu możesz wymienić cały frontend (np. na react-hook-form), a kontrakt
walidacji zostaje bez zmian.

```
[1] Schemat Zod        →  co jest poprawne (źródło prawdy, w module)
[2] Server Action      →  parsuje + zwraca { error, fieldErrors }
[3] Formularz (client) →  pokazuje błąd pod polem + aria-invalid
```

## Części wspólne

| Element | Plik | Rola |
|---|---|---|
| `toFieldErrors(zodError)` | `src/lib/forms.ts` | spłaszcza błędy Zod do `{ pole: komunikat }` |
| `<FieldError message?>` | `src/components/ui/field-error.tsx` | renderuje komunikat pod polem (gdy jest) |
| `aria-invalid` styl | `src/components/ui/input.tsx`, `textarea.tsx` | czerwona ramka |

`toFieldErrors` kluczuje błędy **ostatnim segmentem ścieżki** Zod
(`address.postalCode` → `postalCode`), więc klucze pasują 1:1 do atrybutów
`name` w formularzu (są płaskie).

## Jak dodać walidację do nowego formularza

### 1. Schemat (w module, np. `src/modules/foo/schemas.ts`)

```ts
import { z } from "zod";

export const fooSchema = z.object({
  email: z.string().email("Nieprawidłowy email"),
  age: z.coerce.number().int().min(18, "Wymagane 18+"),
});
```

Zależności między polami → `.superRefine`. Przykłady w repo:
kod pocztowy zależny od kraju (`checkout/schemas.ts`),
wartość rabatu zależna od typu (`discounts/schemas.ts`).

### 2. Akcja (Server Action) — zwróć `fieldErrors`

```ts
"use server";
import { toFieldErrors } from "@/lib/forms";
import { fooSchema } from "./schemas";

export type FooState =
  | { error?: string; success?: string; fieldErrors?: Record<string, string> }
  | undefined;

export async function saveFooAction(
  _prev: FooState,
  formData: FormData,
): Promise<FooState> {
  const parsed = fooSchema.safeParse({
    email: formData.get("email"),
    age: formData.get("age"),
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }
  await saveFoo(parsed.data);
  return { success: "Zapisano." };
}
```

Błąd **związany z konkretnym polem** (np. „email już zajęty") zwracaj jako
sam `fieldErrors`, bez ogólnego `error` — inaczej komunikat zdubluje się
(patrz `auth/actions.ts`, rejestracja).

### 3. Formularz (Client Component)

```tsx
"use client";
import { useActionState } from "react";
import { saveFooAction, type FooState } from "@/modules/foo/actions";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";

export function FooForm() {
  const [state, action, pending] = useActionState<FooState, FormData>(saveFooAction, undefined);
  const errors = state?.fieldErrors;

  return (
    <form action={action}>
      <Input name="email" type="email" aria-invalid={!!errors?.email} required />
      <FieldError message={errors?.email} />
      {/* ... */}
    </form>
  );
}
```

## Konwencje i wyjątki

- **Pola liczbowe/kwoty:** używaj `z.coerce.number()`. Kwoty w PLN waliduj jako
  major units, a na grosze (`toMinor`) konwertuj dopiero **po** sparsowaniu
  (patrz `discounts/actions.ts`). Cena parsowana osobno → waliduj ją w akcji
  i dopisz do `fieldErrors` ręcznie (patrz `createProductAction`).
- **Bezpieczeństwo > wygoda:** przy logowaniu błędne dane to **ogólny** komunikat,
  bez `fieldErrors` — nie zdradzamy, które pole jest złe (`auth/actions.ts`).
  Forgot/reset hasła celowo nie używają walidacji per-pole.
- **Pojedyncze pole** (np. newsletter) nie potrzebuje `fieldErrors` — ogólny
  `error` wystarcza.
- **Akcje typu void** (delete, toggle) nie walidują wejścia użytkownika i zostają
  prostymi `(formData) => void`, wywoływanymi przez `formAction` na przycisku
  wewnątrz formularza stanowego (patrz warianty produktu, bannery).

## Gdzie zobaczyć wzorzec w akcji

Storefront: `checkout`, `login`, `register`, `review`.
Admin: produkt (nowy/edycja + warianty), kategoria, rabat, CMS (strona/wpis/banner),
ustawienia faktur.
