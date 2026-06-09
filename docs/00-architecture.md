# 00 — Architektura i stack

Sklep e-commerce jako **monolit Next.js 16**, projektowany jako **template** do ponownego
użycia w kolejnych projektach. Nacisk na: modularność, brak vendor lock-in, przenośność
hostingu (Coolify/Docker → Vercel bez dużych zmian).

## Stack

| Warstwa            | Wybór                              | Uwagi |
|--------------------|------------------------------------|-------|
| Framework          | Next.js 16 (App Router, RSC)       | `output: standalone` pod Docker |
| Język              | TypeScript (strict)                | |
| Baza danych        | PostgreSQL                         | kontener na Coolify / managed na Vercel |
| ORM                | Prisma                             | migracje, typy, seed |
| Auth               | Auth.js (NextAuth v5)              | sesje DB, role (CUSTOMER/STAFF/ADMIN) |
| Płatności          | Adapter + Stripe (1. impl.)        | patrz `04-adapters.md` |
| Wysyłka            | Adapter + Furgonetka (1. impl.)    | broker = wielu przewoźników |
| Storage plików     | Adapter S3-compatible              | MinIO (Coolify) / S3 (Vercel) |
| UI                 | Tailwind CSS + shadcn/ui           | łatwe podmienianie skórki (Stitch) |
| Walidacja          | Zod                                | współdzielona client/server |
| Formularze         | React Hook Form + Zod              | |
| Mutacje danych     | Server Actions + Route Handlers    | webhooki jako Route Handlers |
| Email              | Adapter + Resend/SMTP              | potwierdzenia zamówień, reset hasła |
| i18n               | next-intl (gotowe, opcjonalne)     | domyślnie PL |
| Testy              | Vitest + Playwright                | |

## Zasady przenośności (Coolify ↔ Vercel)

1. **Storage tylko przez adapter** — nigdy bezpośredni zapis na dysk. MinIO i S3 mają to
   samo API, więc kod się nie zmienia.
2. **Webhooki bezstanowe** — żadnego trzymania stanu w pamięci procesu.
3. **Brak long-running workerów w app** — zadania w tle przez adapter kolejki
   (`04-adapters.md`); domyślnie tryb „inline/cron", na Coolify można podmienić na BullMQ.
4. **Konfiguracja przez ENV** — patrz `.env.example` (do wygenerowania).
5. **`output: standalone`** + `Dockerfile` w repo.

## Struktura katalogów (monolit modularny)

```
src/
  app/
    (storefront)/            # publiczny sklep
      page.tsx               # home
      products/
      product/[slug]/
      cart/
      checkout/
      account/
      (content)/             # strony CMS, blog
    admin/                   # panel admina (chroniony)
      dashboard/
      products/
      orders/
      customers/
      ...
    api/
      webhooks/
        stripe/route.ts
      ...
  modules/                   # logika domenowa (sercem monolitu)
    catalog/                 # produkty, warianty, kategorie, kolekcje
    cart/
    checkout/
    orders/
    customers/
    payments/                # adapter + providers (stripe, p24...)
    discounts/
    reviews/
    content/                 # cms, blog, bannery
    inventory/
    shipping/
    media/                   # storage adapter, upload
    notifications/           # email adapter
    auth/
  lib/                       # prisma client, utils, config, env
  components/                # współdzielone UI (shadcn)
  server/                    # server-only helpers, RBAC guards
prisma/
  schema.prisma
  seed.ts
docs/
```

Każdy moduł w `modules/` eksportuje **services** (czysta logika + Prisma) oraz **schemas**
(Zod). Strony i Server Actions wołają wyłącznie services — UI jest cienkie i wymienne.
Dzięki temu generowany wygląd (Stitch) podpina się do gotowych funkcji bez dotykania logiki.

## Warstwy

```
UI (RSC/Client)  ──>  Server Actions / Route Handlers  ──>  Services (modules/*)  ──>  Prisma ──> Postgres
                                   │
                                   └──> Adapters (payments, storage, email, queue)
```

- **UI** nie zna Prismy. Tylko services.
- **Services** zawierają reguły biznesowe i są testowalne w izolacji.
- **Adapters** chowają zewnętrzne SaaS za interfejsem (łatwa podmiana).

## Moduły v1 (flagowane)

| Moduł        | v1  | Flaga |
|--------------|-----|-------|
| Rdzeń sklepu | ✅  | zawsze |
| Marketing (rabaty, recenzje, wishlist) | ✅ | `FEATURE_MARKETING` |
| CMS/blog     | ✅  | `FEATURE_CMS` |
| Faktury (VAT i bez VAT) | ✅ | `FEATURE_INVOICES` |
| Multi-region (i18n, waluty, podatki) | przygotowane | `FEATURE_MULTIREGION` |
| Produkty cyfrowe | model gotowy | `FEATURE_DIGITAL` |
