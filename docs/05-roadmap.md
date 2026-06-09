# 05 — Plan wdrożenia (fazy)

Kolejność budowy szablonu. Każda faza zostawia działający, testowalny przyrost. UI generujemy
(Stitch) na końcu każdej fazy na bazie gotowych services.

## Faza 0 — Fundament
- [ ] Next.js 16 (App Router, TS strict), Tailwind + shadcn/ui.
- [ ] Prisma + Postgres, `schema.prisma` (z `01-database.md`), pierwsza migracja, `seed.ts`.
- [ ] `lib/env.ts` (Zod), `.env.example`, feature flags.
- [ ] `Dockerfile` (`output: standalone`) + `docker-compose` dev (app + postgres + minio).
- [ ] Struktura `modules/` + `prisma` client singleton.

## Faza 1 — Auth & RBAC
- [x] Auth.js v5 (email+hasło; OAuth gotowe do dodania), adapter Prisma, sesje JWT.
- [x] Role CUSTOMER/STAFF/ADMIN, `server/rbac.ts` + `server/session.ts`, ochrona `/admin/**`
      i `/account/**` przez `src/proxy.ts` (Next 16) + `requireRole` w layoutach.
- [x] Strony auth (login/register/forgot) + `/account` + szkielet panelu admina.

## Faza 2 — Katalog (admin + storefront)
- [x] Services: products, variants, categories, media (upload S3 przez presigned URL).
- [x] Admin: lista/edycja produktów (szczegóły+SEO), warianty (CRUD + stan), kategorie, upload zdjęć.
- [x] Storefront: katalog z filtrami (q/kategoria/sort) + paginacja, karta produktu z selektorem wariantów.
- [x] ISR (`export const revalidate`) + `revalidatePath` po zmianach w adminie.
- [ ] (przeniesione) Kolekcje, macierz opcji→warianty, sort po cenie, biblioteka mediów — później.

## Faza 3 — Koszyk & checkout & płatności
- [x] Cart service (gość przez cookie + zalogowany przez userId), licznik w nagłówku.
- [x] Inventory: rezerwacje/commit/release (idempotentne).
- [x] Payments adapter + Stripe (Checkout Sessions) + provider `manual` (fallback bez kluczy);
      webhook handler `/api/webhooks/[provider]`.
- [x] Checkout (kontakt+adres+metoda wysyłki+punkt odbioru) + strona sukcesu.
- [x] Order service (snapshot, numer, timeline) + potwierdzenie email (adapter, fallback konsolowy).
- [ ] (przeniesione) Scalanie koszyka gościa po zalogowaniu; widget Paczkomatu (Faza 4);
      Resend/SMTP email; podatki/VAT na zamówieniu.

## Faza 4 — Panel zamówień + wysyłka
- [x] Admin: lista zamówień (filtry/paginacja), szczegóły (pozycje, adres, płatności+zwroty,
      przesyłki, timeline) + akcje: status, oznacz opłacone, anuluj, notatka, ponowny e-mail.
- [x] Shipping adapter (`CarrierProvider`) + provider `manual` (admin wpisuje tracking) +
      **realny `FurgonetkaProvider`** (OAuth2 password grant, getRates/createShipment+etykieta/
      getTracking/getPickupPoints) — przetestowany wobec sandboxa; `shipment-service` buduje
      paczki z pozycji zamówienia.
- [x] Zwroty przez adapter płatności (`refundPayment`, Stripe + manual).
- [x] Historia zamówień klienta (`/account/orders`).
- [ ] (przeniesione) Widget Paczkomatu w checkoucie (getPickupPoints gotowe), wycena na żywo
      w panelu (getRates gotowe — brak UI), tracking webhook+cron, zapis etykiety do storage.

## Faza 5 — Marketing
- [x] Rabaty (PERCENT/FIXED/FREE_SHIPPING): walidacja w koszyku, w checkoucie i przy zamówieniu
      (limity, daty, min. koszyk, zliczanie użyć); admin `/admin/discounts`.
- [x] Recenzje: formularz na karcie produktu (zalogowani), średnia/lista zatwierdzonych,
      moderacja `/admin/reviews`.
- [x] Lista życzeń (`/account/wishlist` + przycisk na produkcie), newsletter (stopka + zapis).

## Faza 6 — CMS
- [x] Strony statyczne (`/p/[slug]`) + admin CRUD; blog (`/blog`, `/blog/[slug]`) + admin CRUD.
- [x] Bannery (admin upsert wg klucza) + biblioteka mediów (upload/usuwanie przez storage).
- [x] Edytowalna strona główna (`(shop)/page.tsx`: hero z bannera + nowości). Za flagą `FEATURE_CMS`.
- [ ] (przeniesione) Rich text / render Markdown (teraz `whitespace-pre-wrap`), kuratorskie sekcje home.

## Faza 7 — Hardening & template polish
- [x] Testy: Vitest (unit: utils, rabaty, wysyłka — 12 testów) + scaffold Playwright e2e (`e2e/`).
- [x] SEO: `sitemap.xml`, `robots.txt`, OpenGraph (layout + produkt), JSON-LD Product.
- [x] Dokumentacja „jak użyć jako template" (`docs/06-template-usage.md`).
- [x] Deploy zweryfikowany: `docker build` (runner) + runtime (serwer + Prisma) + etap `migrator`
      (`migrate deploy`); compose usługa `migrate` (profil prod). Vercel-portable (notatki w docs).
- [ ] (przeniesione) Playwright run w CI (wymaga `npx playwright install`), smoke test na Vercel.

## Opcjonalne (za flagą, po v1)
- Multi-region: waluty, i18n (next-intl), strefy podatkowe, tłumaczenia.
- Produkty cyfrowe: dostarczanie plików, limity pobrań.
- Płatności: Przelewy24 / PayU / BLIK (nowe klasy `PaymentProvider`).

## Decyzje przyjęte (kontekst)
- Stack: Next.js 16 + Postgres + Prisma + Auth.js v5.
- Płatności: adapter + Stripe pierwszy (P24/PayU później bez zmian w logice).
- Wysyłka: adapter `CarrierProvider` + Furgonetka pierwszy (broker = wielu przewoźników).
  Klient płaci stałą cenę metody; admin przy realizacji ustala wymiary paczki i widzi
  faktyczny koszt przewoźnika (marża). Tracking webhook+cron, wybór Paczkomatu w checkoucie.
- Storage: adapter S3-compatible (MinIO/Coolify ↔ S3/Vercel).
- Hosting: Coolify (Docker) główny, Vercel-portable.
- Produkty: fizyczne z wariantami; cyfrowe przygotowane za flagą.
- UI: PL, i18n-ready; nazwy w kodzie po angielsku.
- Zakres v1: Rdzeń + Marketing + CMS; multi-region przygotowany.
