# store-monolit

E-commerce template oparty na **Next.js 16** w architekturze monolitycznej — projektowany do
wielokrotnego użycia jako baza pod kolejne sklepy. UI generowany później (np. Stitch) i
podpinany do gotowych, stabilnych funkcji domenowych.

## Stack
Next.js 16 · TypeScript · PostgreSQL · Prisma · Auth.js v5 · Stripe (adapter płatności) ·
Furgonetka (adapter wysyłki) · S3-compatible storage · Tailwind + shadcn/ui · Zod.

Hosting: **Coolify (Docker)** jako główny, przenośny na **Vercel** bez dużych zmian.

## Dokumentacja projektu
- [`docs/00-architecture.md`](docs/00-architecture.md) — stack, struktura, zasady przenośności.
- [`docs/01-database.md`](docs/01-database.md) — pełny model danych (Prisma).
- [`docs/02-admin-panel.md`](docs/02-admin-panel.md) — panel admina: ekrany i akcje.
- [`docs/03-storefront.md`](docs/03-storefront.md) — szkic stron sklepu.
- [`docs/04-adapters.md`](docs/04-adapters.md) — adaptery: płatności, storage, email, kolejka.
- [`docs/05-roadmap.md`](docs/05-roadmap.md) — fazy wdrożenia.
- [`docs/06-template-usage.md`](docs/06-template-usage.md) — jak założyć nowy sklep z template.
- [`docs/07-template-sync.md`](docs/07-template-sync.md) — workflow gita: nowe sklepy + synchronizacja zmian z template.

## Szybki start (dev)

```bash
# 1. Zależności
npm install

# 2. Konfiguracja
cp .env.example .env        # uzupełnij sekrety (dev działa z wartościami domyślnymi)

# 3. Usługi zależne (Postgres + MinIO)
docker compose up -d postgres minio minio-setup

# 4. Baza: migracje + dane przykładowe
npm run db:migrate          # tworzy/aktualizuje schemat
npm run db:seed             # admin + przykładowy produkt

# 5. Start
npm run dev                 # http://localhost:3000
```

**Konto admina (seed):** `admin@example.com` / `admin123`
**MinIO console:** http://localhost:9001 (`minioadmin` / `minioadmin`)

Skrypty: `dev`, `build`, `start`, `lint`, `typecheck`,
`db:migrate`, `db:seed`, `db:studio`, `db:push`, `db:reset`, `db:generate`.

## Struktura
- `src/app/` — trasy (storefront + `admin/` + `api/`)
- `src/modules/` — logika domenowa (services + adaptery + schematy Zod)
- `src/lib/` — `env` (walidacja Zod), `prisma` (klient + adapter PG), `config` (flagi, formatMoney), `utils`
- `src/server/` — RBAC i helpery server-only
- `prisma/` — `schema.prisma`, migracje, `seed.ts`
- `src/generated/prisma/` — wygenerowany klient Prisma (gitignored)

## Status
- ✅ **Faza 0 (scaffold)** — Next 16 + Prisma 7 (driver adapter PG) + Tailwind v4/shadcn +
  Docker (Postgres/MinIO). Schemat zmigrowany, seed działa.
- ✅ **Faza 1 (Auth & RBAC)** — Auth.js v5 (email+hasło, sesje JWT, role), ochrona tras przez
  `src/proxy.ts` + `requireRole`, strony `/auth/*`, `/account`, szkielet `/admin`.
- ✅ **Faza 2 (Katalog)** — storage S3/MinIO (presigned upload), services katalogu, admin
  (produkty: szczegóły/SEO/warianty/zdjęcia, kategorie), storefront (`/products`, `/category/[slug]`,
  `/product/[slug]` z selektorem wariantów), ISR + `revalidatePath`.
- ✅ **Faza 3 (Koszyk/checkout/płatności)** — koszyk (gość+zalogowany), rezerwacje magazynu,
  adapter płatności (Stripe Checkout + `manual` fallback), webhook `/api/webhooks/[provider]`,
  checkout + strona sukcesu, service zamówień + email (fallback konsolowy).
- ✅ **Faza 4 (Zamówienia + wysyłka)** — panel admina: lista + szczegóły zamówienia (płatności,
  zwroty, przesyłki, timeline, akcje statusu/opłacenia/anulowania/notatki/e-mail), adapter
  przewoźnika (`manual` + realna Furgonetka, sandbox-tested), historia zamówień (`/account/orders`).
- ✅ **Faza 5 (Marketing)** — kody rabatowe (%/kwota/darmowa wysyłka) w koszyku/checkoucie/zamówieniu
  + `/admin/discounts`; recenzje z moderacją (`/admin/reviews`); lista życzeń (`/account/wishlist`);
  newsletter (stopka). Za flagą `FEATURE_MARKETING`.
- ✅ **Faza 6 (CMS)** — strony statyczne (`/p/[slug]`), blog (`/blog`), bannery, biblioteka mediów,
  edytowalna strona główna (hero + nowości); panel `/admin/content/*`. Za flagą `FEATURE_CMS`.
- ✅ **Faza 7 (Hardening)** — testy Vitest (+ scaffold Playwright `e2e/`), SEO (sitemap/robots/OG/
  JSON-LD), `docs/06-template-usage.md`, deploy zweryfikowany (Docker build + runtime + migracje).

Logowanie: wejdź na `/auth/login` (admin z seeda: `admin@example.com` / `admin123`).

> **Dev:** uruchamiaj `npm run dev`. `next start` nie działa z `output: standalone` —
> produkcja idzie przez Docker (`node server.js`).

> **Płatności:** bez `STRIPE_SECRET_KEY` działa provider `manual` (płatność offline). Po dodaniu
> kluczy Stripe automatycznie używany jest Stripe Checkout. Webhook: `POST /api/webhooks/stripe`.

> **Wysyłka:** bez `FURGONETKA_*` działa provider `manual` (admin wpisuje przewoźnika/numer).
> Po ustawieniu `FURGONETKA_*` (OAuth2 password grant + adres nadawcy) aktywuje się realny
> adapter Furgonetki: wycena, nadanie + etykieta, tracking, punkty odbioru (zweryfikowane na
> sandboxie). W panelu zamówienia wybierz provider `furgonetka` i podaj `service_id`.

- ✅ **Moduł faktur + VAT** — faktury VAT i bez VAT (działalność nierejestrowana/zwolnienie;
  o typie decyduje status VAT sprzedawcy), **stawka VAT per produkt** (23/8/5/0) i **VAT liczony
  na zamówieniu** (`Order.taxAmount`, rabat proporcjonalny, faktura wielostawkowa), wystawianie
  z zamówienia, widok do druku (HTML→PDF), dostęp klienta. Flaga `FEATURE_INVOICES`.

**Wszystkie fazy (0-7) ukończone** — szablon gotowy do użycia. Pozostały opcjonalne uzupełnienia
(patrz [`docs/05-roadmap.md`](docs/05-roadmap.md)): scalanie koszyka po logowaniu, widget
Paczkomatu w checkoucie, Resend/SMTP, VAT na zamówieniu, rich text dla CMS, Playwright w CI.
