# 06 — Użycie jako template

Jak wystartować nowy sklep na bazie `store-monolit`.

## 1. Nowy projekt

```bash
# skopiuj repo bez historii gita
npx degit <repo-url> moj-sklep   # albo: git clone ... && rm -rf .git && git init
cd moj-sklep
npm install
```

Zmień `name` w `package.json`, tytuł/branding w `src/app/layout.tsx`
(`metadata`), nazwę sklepu w seedzie/ustawieniach (`Setting "store.name"`).

## 2. Konfiguracja

```bash
cp .env.example .env
# uzupełnij: DATABASE_URL, AUTH_SECRET (openssl rand -base64 32), APP_URL
```

**Flagi funkcji** (`.env`) — włącz/wyłącz moduły bez ruszania kodu:
`FEATURE_MARKETING`, `FEATURE_CMS`, `FEATURE_MULTIREGION`, `FEATURE_DIGITAL`.

**Integracje** (opcjonalne — bez nich działają fallbacki):
- Płatności: `STRIPE_*` → Stripe Checkout; brak → provider `manual` (offline).
- Wysyłka: `FURGONETKA_*` + `FURGONETKA_SENDER_*` → Furgonetka; brak → `manual`.
- Storage: `S3_*` (MinIO/AWS/R2) — wymagane do uploadu zdjęć.
- Email: jawny `EMAIL_PROVIDER` = `resend` (z `RESEND_API_KEY`) / `smtp` (z `SMTP_*`) / `console`
  (domyślnie — tylko logi, nie wysyła). Maile: potwierdzenie zamówienia (przy złożeniu),
  płatność otrzymana (przy PAID), wysyłka, zwrot, anulowanie, powitalny, reset hasła —
  szablony w `src/modules/notifications/templates/` (edytowalne).
  **Dev:** `docker compose up -d mailpit` + w `.env` `EMAIL_PROVIDER=smtp`, `SMTP_HOST=localhost`,
  `SMTP_PORT=1025` → podgląd maili na http://localhost:8025.

## 3. Baza

```bash
docker compose up -d postgres minio minio-setup   # usługi dev
npm run db:migrate                                  # schemat
npm run db:seed                                     # admin + przykładowe dane
npm run dev                                          # http://localhost:3000
```

Admin: `admin@example.com` / `admin123` (zmień po pierwszym logowaniu).

## 3a. Konfiguracja modułów per-sklep

Dwa mechanizmy, oba przez `.env` (zero kodu):

**Włącz/wyłącz cały moduł — flagi `FEATURE_*`:**
- `FEATURE_INVOICES`, `FEATURE_MARKETING`, `FEATURE_CMS`, `FEATURE_DIGITAL`, `FEATURE_MULTIREGION`.
- Wyłączona flaga **chowa UI i twardo blokuje trasy modułu** (404 przez `requireFeature` w
  layout/page) — np. `FEATURE_INVOICES=false` → `/admin/invoices`, `/admin/settings/invoices`,
  `/account/invoices/*` zwracają 404, znika menu „Faktury", nie liczy się VAT.

**Wybór bramki płatności / przewoźnika:**
- Provider aktywuje się przez obecność kluczy: `STRIPE_*` → Stripe, `FURGONETKA_*` → Furgonetka;
  bez kluczy działa `manual`.
- Domyślny provider można wymusić jawnie: `PAYMENT_PROVIDER=stripe`, `SHIPPING_PROVIDER=furgonetka`
  (gdy pusty — auto: jest klucz → dany provider, inaczej `manual`; nieznany/niezarejestrowany →
  bezpieczny fallback na `manual`).
- Dodanie nowej bramki (Przelewy24/PayU) = nowa klasa `PaymentProvider`/`CarrierProvider` +
  wpis w rejestrze (`docs/04-adapters.md`), potem wskazujesz ją w `PAYMENT_PROVIDER`.

> Trwałe usunięcie modułu (mniejszy build/obraz) = skasowanie folderu `modules/<x>` + jego tras,
> patrz `docs/07-template-sync.md`. Do zwykłego „nie chcę tej funkcji w tym sklepie" wystarczy flaga.

## 4. Dostosowanie wyglądu

- Logika jest oddzielona od UI (`src/modules/*` = services, `src/app/*` = cienkie widoki).
  Wygenerowany wygląd (np. Stitch) podpinasz do gotowych services bez zmian w logice.
- Motyw/kolory: zmienne CSS w `src/app/globals.css` (tokens shadcn).
- Komponenty bazowe: `src/components/ui/*` — można podmienić na pełne shadcn
  (`npx shadcn@latest add ...`, `components.json` już skonfigurowany).

## 5. Jakość

```bash
npm run typecheck   # TS
npm run lint        # ESLint
npm run test        # Vitest (unit)
npm run test:e2e    # Playwright (wymaga: npx playwright install)
```

## 6. Deploy

### Coolify (Docker — główny)
- Repo z `Dockerfile` (multi-stage, `output: standalone`). Runner uruchamia tylko `node server.js`.
- **Migracje** robi osobny etap `migrator` (pełne zależności Prisma):
  - lokalnie/compose: `docker compose --profile prod up --build` (usługa `migrate` odpala
    `prisma migrate deploy` przed `app`),
  - Coolify: ustaw pre-deploy/release command na `npx prisma migrate deploy` (lub zbuduj
    `--target migrator`). Build runtime nie wymaga bazy.
- Dodaj usługi: PostgreSQL + (opcjonalnie) MinIO/Redis.
- Ustaw ENV jak w `.env.example` (`DATABASE_URL` na wewnętrzny host, `APP_URL` na domenę).
- Build z `Dockerfile`; port 3000. Build potrzebuje placeholderów `DATABASE_URL`/`AUTH_SECRET`
  (są w stage builder) — realne wartości wstrzyknij w runtime.

### Vercel (przenośnie)
- Import repo; ustaw ENV. Postgres: Neon/Supabase; storage: S3/R2 (te same `S3_*`).
- `output: standalone` nie przeszkadza; Vercel użyje własnego runtime.
- **Uwaga:** `next start` NIE działa z `output: standalone` — lokalnie używaj `npm run dev`,
  a w kontenerze `node server.js` (robi to `Dockerfile`).

## 7. Po wdrożeniu
- Webhooki: Stripe → `POST /api/webhooks/stripe` (ustaw `STRIPE_WEBHOOK_SECRET`).
- Cron (opcjonalnie): czyszczenie koszyków, sync trackingu (Faza 7+).
- Zmień hasło admina i sekrety; wyłącz `FURGONETKA_SANDBOX`.

Struktura i decyzje: `docs/00-architecture.md`; mapa funkcji: `docs/05-roadmap.md`.
