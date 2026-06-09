# 09 — KSeF (Krajowy System e-Faktur)

Integracja z KSeF jako wymienny adapter e-fakturowania. Wzorzec jak płatności/wysyłka
(patrz `docs/04-adapters.md`): jeden kod, wybór w runtime przez `.env`.

> **Status regulacyjny (czerwiec 2026, do bieżącej weryfikacji z MF).**
> Obowiązek wg ustawy z 5.08.2025: **1.02.2026** duże firmy (sprzedaż > 200 mln zł w 2024)
> + wszyscy **odbierają** faktury przez KSeF; **1.04.2026** pozostali wystawiają; najmniejsi
> (faktury ≤ 450 zł i ≤ 10 tys. zł/mies.) — od **2027**. Schema **FA(3)** zastąpiła FA(2)
> od 1.02.2026. API **KSeF 2.0** (v2). Uwierzytelnianie: token **tylko do 31.12.2026**,
> od **1.01.2027 wyłącznie certyfikat** — dlatego adapter projektujemy pod certyfikat.

## Przełączniki

| Flaga | Rola |
|---|---|
| `FEATURE_INVOICES` | cały moduł faktur on/off |
| `KSEF_ENABLED` | `false` → provider `none` (faktury lokalne, „po staremu"); `true` → provider `ksef` |
| `KSEF_ENV` | `test` / `demo` / `prod` (środowiska odseparowane) |
| `KSEF_NIP` | NIP podmiotu wystawiającego |
| `KSEF_CERT_PATH` / `KSEF_CERT_PASSWORD` | certyfikat KSeF (ścieżka docelowa) |
| `KSEF_TOKEN` | token — tylko do testów, wygasa 31.12.2026 |

Każdy sklep to osobny deployment z własnym `.env` (patrz `docs/06`, `07`) — dwa sklepy
różni tylko `KSEF_ENABLED`, nie kod.

## Co już jest (zrobione)

- **Model** (`prisma/schema.prisma`): enum `KsefStatus` (`NOT_SENT`/`PENDING`/`ACCEPTED`/`REJECTED`)
  + pola na `Invoice`: `ksefStatus`, `ksefReference`, `ksefNumber`, `ksefUpoXml`, `ksefSentAt`, `ksefError`.
- **Konfiguracja**: flagi `KSEF_*` w `src/lib/env.ts` i `.env.example`.
- **Adapter** (`src/modules/invoices/efaktura/`):
  - `types.ts` — kontrakt `EInvoiceProvider` (`submit` → numer referencyjny, `getStatus` → numer KSeF + UPO) + `EInvoiceData` (dane niezależne od ORM).
  - `providers/none.ts` — no-op (KSeF wyłączony).
  - `providers/ksef.ts` — **szkielet**: base URL per środowisko, wykrycie metody auth, walidacja konfiguracji. `submit`/`getStatus` rzucają „niezaimplementowany".
  - `registry.ts` — `getEInvoiceProvider()`.
  - `service.ts` — `submitInvoiceToKsef(id)`, `refreshKsefStatus(id)`, mapowanie `toEInvoiceData`.
- **Wpięcie**: `createInvoiceFromOrder` woła `submitInvoiceToKsef` (best-effort, za flagą).
- **Admin**: akcje `submitKsefAction`/`refreshKsefAction` + panel statusu w `/admin/invoices/[id]`.
- **Schema FA(3)**: XSD + przykłady + OpenAPI w `efaktura/schema/` (XSD/schemat.xsd, namespace `…/2025/06/25/13775/`).
- **Builder FA(3)** (`efaktura/fa3.ts`) + testy (`fa3.test.ts`): mapuje `EInvoiceData` → XML FA(3)
  dla standardowej faktury VAT (23/8/5%). **Wynik zwalidowany względem XSD** (lxml/xmllint).
  Przypadki niewspierane (0%/zw, marża, korekty, waluty obce) rzucają jawny błąd.

Migracja po zmianach schematu: `npx prisma migrate dev --name invoice_ksef_fields && npx prisma generate`.

## Plan dopięcia (do zrobienia)

### Etap 1 — Schema FA(3) i builder XML ✅ ZROBIONE

- XSD + przykłady + OpenAPI w `efaktura/schema/`.
- `efaktura/fa3.ts` — `buildFa3Xml(EInvoiceData, opts)`: Naglowek, Podmiot1/2 (NIP lub `BrakID` dla B2C),
  Fa z koszykami VAT `P_13_x`/`P_14_x` (23→1, 8→2, 5→3), pozycje (`P_7`/`P_8A`/`P_8B`/`P_9A`/`P_11`/`P_12`),
  `Adnotacje`, `JST`/`GV`. Kwoty: grosze → `TKwotowy` (2 miejsca).
- Testy `fa3.test.ts` + walidacja XSD (lxml). Niewspierane przypadki rzucają jawny błąd.

**Walidacja XSD lokalnie** (XSD importuje typy `etd` z URL MF — potrzebny dostęp do sieci):
```bash
python3 -c "from lxml import etree; \
  s=etree.XMLSchema(etree.parse('src/modules/invoices/efaktura/schema/XSD/schemat.xsd')); \
  print(s.validate(etree.parse('faktura.xml')) or list(s.error_log))"
```

Faktura **zwolniona (zw)** obsłużona w Etapie 5. Wciąż rzuca błąd (świadomie): stawki **0%**
(KR/WDT/EX), **korekty (KOR)**, waluty obce.

### Etap 2 — Uwierzytelnianie (token KSeF → accessToken) ✅ ZROBIONE (token)

`efaktura/ksef-client.ts` — `KsefClient.authenticateWithToken(token, nip)`:
1. `POST /auth/challenge` → `challenge` + `timestampMs`.
2. Klucz publiczny: `GET /security/public-key-certificates` (usage `KsefTokenEncryption`, DER).
3. `encryptedToken` = RSA-OAEP(SHA-256) z `token|timestampMs` (Base64).
4. `POST /auth/ksef-token` → `referenceNumber` + `authenticationToken`.
5. `GET /auth/{ref}` (poll, status 200) → `POST /auth/token/redeem` → **accessToken (JWT)**.

**Etap 2b — certyfikat (XAdES) ✅ ZROBIONE.** `efaktura/xades.ts` + `auth-request.ts`:
- `buildAuthTokenRequestXml(challenge, nip, subjectType)` — dokument w ns `…/auth/token/2.0`.
- `signXades(xml, certPem, keyPem)` — podpis **enveloped XAdES-BES** (C14N exclusive, SHA-256,
  RSASSA-PKCS1-v1_5) biblioteką `xadesjs` (+ `@peculiar/webcrypto`, `@xmldom/xmldom`).
- `KsefClient.authenticateWithCertificate(...)` → `POST /auth/xades-signature` (application/xml).
- Provider wybiera ścieżkę po `.env`: `KSEF_CERT_PATH`(+`KSEF_KEY_PATH`) → cert, inaczej `KSEF_TOKEN`.
- `KSEF_CERT_SUBJECT_TYPE`: `certificateFingerprint` (self-signed/TE) lub `certificateSubject` (cert kwalifikowany).
- Test offline `xades.test.ts`: podpis + weryfikacja (round-trip; cert z openssl, kluczy nie commitujemy).

### Etap 3 — Wysyłka i status ✅ ZROBIONE

`KsefProvider` (`providers/ksef.ts`) + `KsefClient`:
- `submit`: `buildFa3Xml` → `openOnlineSession` (AES-256, klucz szyfrowany RSA-OAEP) →
  `sendInvoice` (faktura AES-256-CBC/PKCS#7 + hashe SHA-256) → `referenceNumber` = `sesja:faktura`.
- `getStatus`: `GET /sessions/{s}/invoices/{i}` → `ACCEPTED` (numer KSeF + UPO) / `REJECTED` / `PENDING`.
- Deterministyczna część (`buildSendInvoicePayload`) pokryta testem offline; reszta (RSA/HTTP) — test na `api-test`.

> **Weryfikacja end-to-end:** klient jest napisany wg OpenAPI, ale pełen obieg (RSA + sieć)
> trzeba potwierdzić uruchomieniem przeciw `api-test` z realnym tokenem — **lokalnie u Ciebie**
> (tokenu nie przepuszczamy przez środowisko deweloperskie). Najczęstsze źródło ewentualnych
> poprawek: dokładny format szyfrowania tokenu i parametry sesji.

### Etap 4 — Job statusu (auto-odpytywanie) ✅ ZROBIONE

- `jobs/inline-queue.ts` — `InlineJobQueue` (implementacja kontraktu `JobQueue`): zadania w tym
  samym procesie przez `setTimeout`. `jobs/index.ts` rejestruje handlery → `getJobQueue()`.
- `efaktura/service.ts`: po `submit` enqueue `ksef:poll-status`; handler woła `refreshKsefStatus`,
  a gdy wciąż `PENDING` — przekolejkowuje się z backoffem (5s,10s… maks. 60s, do 12 prób).
- Przycisk „Odśwież status" w adminie zostaje jako **fallback** (ręczne wymuszenie).
- Test offline `jobs/inline-queue.test.ts` (enqueue/delay/błędy).

**Ograniczenia trybu inline:** zadania nie przeżywają restartu procesu i nie działają w serverless.
Produkcyjnie: wymień `InlineJobQueue` na BullMQ + Redis (patrz `docs/04-adapters.md`) — wołający bez zmian.

### Etap 5 — Przypadki podatkowe

✅ **Faktura zwolniona (zw)** — gdy `invoice.type === "NO_VAT"`: cała sprzedaż → `P_13_7`,
pozycje `P_12="zw"`, `Adnotacje/Zwolnienie` = `P_19=1` + `P_19A` (podstawa z `seller.exemptionNote`).
Wymaga podanej podstawy zwolnienia (inaczej builder rzuca błąd). Zwalidowane względem XSD.
✅ **B2C bez NIP** — `Podmiot2/BrakID` (zrobione już w Etapie 1).

Do decyzji biznesowej / dalszych etapów (builder dziś rzuca jasny błąd):
- **Stawki 0%** — `0 KR` (krajowa) / `0 WDT` / `0 EX` — wymaga rozróżnienia w domenie sklepu.
- **Faktury korygujące (KOR)** — wymagają najpierw modelu korekt w sklepie (referencja do oryginału, różnice).
- **Tryb offline (offline24)** — wystawienie z QR przy awarii KSeF + dosłanie w terminie.
- **Strona odbiorcza** — pobieranie faktur zakupowych z KSeF (obowiązek odbioru od 1.02.2026).

## Testowanie

- Środowisko testowe: `KSEF_ENV=test` → `api-test.ksef.mf.gov.pl`, docs `/docs/v2/index.html`.
- Wymaga testowego NIP-a i certyfikatu/tokenu ze **środowiska testowego** (prod ma osobne klucze).
- Najpierw walidacja XML względem XSD lokalnie, potem pełny obieg na środowisku testowym.

## Źródła

- [Dokumentacja API KSeF 2.0 + struktura FA(3) — MF/gov.pl](https://www.gov.pl/web/finanse/publikacja-dokumentacji-api-ksef-20-oraz-struktury-logicznej-fa3)
- [Pliki do pobrania KSeF 2.0 (XSD, OpenAPI)](https://ksef.podatki.gov.pl/pliki-do-pobrania-ksef-20/)
- [Dokumentacja API środowiska testowego (TE)](https://api-test.ksef.mf.gov.pl/docs/v2/index.html)
- [Certyfikaty KSeF](https://ksef.podatki.gov.pl/informacje-ogolne-ksef-20/certyfikaty-ksef/)
- [Harmonogram KSeF 2026](https://amavat.pl/terminy-i-obowiazki-zwiazane-z-ksef-aktualny-harmonogram-zmian/)
