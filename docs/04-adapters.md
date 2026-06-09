# 04 — Adaptery (płatności, storage, email, kolejka)

Wszystko zewnętrzne chowamy za interfejsem w `modules/*`. Reszta aplikacji zna tylko
interfejs — podmiana implementacji = jedna zmiana w fabryce + ENV. To klucz do „template,
który łatwo dostosować".

## Płatności — `modules/payments`

Interfejs providera (każda bramka go implementuje):

```ts
export interface PaymentProvider {
  readonly id: string;                  // "stripe" | "przelewy24" | "payu"

  /** Inicjuje płatność dla zamówienia. Zwraca dane do dokończenia po stronie klienta
   *  (np. clientSecret / redirect URL). */
  createPayment(input: {
    order: OrderForPayment;             // id, kwota, waluta, email, opis
    returnUrl: string;
  }): Promise<CreatePaymentResult>;     // { providerRef, clientSecret?, redirectUrl? }

  /** Weryfikuje i parsuje webhook → znormalizowane zdarzenie. */
  parseWebhook(req: Request): Promise<PaymentEvent>;
  // PaymentEvent: { type: "paid"|"failed"|"refunded"|..., providerRef, amount, raw }

  /** Zwrot środków (pełny/częściowy). */
  refund(input: { providerRef: string; amount: number }): Promise<RefundResult>;
}
```

Warstwa serwisowa (`payments.service.ts`) jest provider-agnostyczna:

```ts
payments.createForOrder(orderId)   // wybiera providera z ustawień, woła createPayment, zapisuje Payment
payments.handleWebhook(providerId, req)  // parseWebhook → aktualizuje Order/Payment, emituje OrderEvent
payments.refund(paymentId, amount)
```

Rejestr providerów:

```ts
const providers = { stripe: new StripeProvider(env), /* przelewy24: new P24Provider(env) */ };
export const getProvider = (id: string) => providers[id] ?? throwUnsupported(id);
```

Route handler webhooka (jeden per provider, cienki):
```
src/app/api/webhooks/[provider]/route.ts  → payments.handleWebhook(params.provider, req)
```

**Dodanie Przelewy24/PayU później** = nowa klasa implementująca `PaymentProvider` +
wpis w rejestrze + klucze w ENV. Logika zamówień bez zmian.

### Stripe (1. implementacja)
- Payment Intents + Payment Element na froncie.
- Webhook: `payment_intent.succeeded` → `paid`, `charge.refunded` → `refunded`.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

## Wysyłka / przewoźnicy — `modules/shipping`

Wzorzec jak w płatnościach. **Ważne rozróżnienie cen:**

- **Klient** zawsze widzi i płaci **stałą cenę** metody (`ShippingMethod.priceAmount`).
  Checkout NIE woła API przewoźnika — szybko i niezawodnie.
- **Admin** przy realizacji ustala wymiary paczki dla danego zamówienia i przez
  `getRates()` widzi **faktyczny koszt** przewoźnika, po czym tworzy przesyłkę + etykietę.
  Koszt ląduje w `Shipment.costAmount` (≠ pobrane od klienta) → marża/raporty.

`ShippingMethod` to konfiguracja metody (cena dla klienta + domyślny provider/usługa).

```ts
export interface CarrierProvider {
  readonly id: string;                          // "furgonetka"

  /** Faktyczny koszt przewoźnika — używane TYLKO po stronie admina przy realizacji,
   *  nie w checkoucie. Admin podaje wymiary paczek. */
  getRates(input: {
    parcels: Parcel[];                          // waga g, wymiary mm
    destination: AddressLike;
    declaredValue: number;                      // grosze
    serviceCode?: string;
  }): Promise<CarrierRate[]>;                    // { serviceCode, carrier, amount, currency, eta }

  /** Tworzy przesyłkę → numer, tracking, etykieta. */
  createShipment(input: {
    order: OrderForShipment;
    serviceCode: string;
    pickupPoint?: PickupPoint;
    parcels: Parcel[];
  }): Promise<ShipmentResult>;                   // { providerRef, trackingNumber, trackingUrl, labelUrl }

  getTracking(trackingNumber: string): Promise<TrackingStatus>;

  /** Punkty odbioru / Paczkomaty wokół lokalizacji. */
  getPickupPoints?(q: { lat?: number; lng?: number; postalCode?: string; query?: string }): Promise<PickupPoint[]>;

  /** Webhook ze statusem przesyłki → znormalizowane zdarzenie. */
  parseWebhook?(req: Request): Promise<TrackingEvent>;

  cancelShipment?(providerRef: string): Promise<void>;
}
```

Warstwa serwisowa (`shipping.service.ts`), provider-agnostyczna:

```ts
shipping.options(cart, address)      // KLIENT: zwraca dostępne metody + stałą cenę (priceAmount). Bez API.
shipping.estimateCost(orderId, parcels, serviceCode?)  // ADMIN: getRates() → podgląd faktycznego kosztu
shipping.createShipment(orderId, methodId, parcels)    // ADMIN: tworzy przesyłkę, zapisuje Shipment + labelUrl + costAmount
shipping.handleWebhook(providerId, req)       // parseWebhook → aktualizuje Shipment.status + OrderEvent
shipping.syncTracking()                        // CRON fallback: polling getTracking dla aktywnych przesyłek
```

**Wymiary paczki (admin):** podpowiadane z `ProductVariant` (`weightGrams`, `lengthMm`...)
zsumowane po pozycjach + „domyślna paczka" z ustawień; admin może nadpisać per zamówienie.
Zapisywane w `Shipment.parcels`.

**Tracking (webhook + fallback cron):** `parseWebhook` aktualizuje status na bieżąco;
`shipping.syncTracking()` z crona (Vercel Cron / Coolify scheduler) dobija brakujące.

Rejestr + webhook handler analogicznie do płatności:
```
const carriers = { furgonetka: new FurgonetkaProvider(env) };
src/app/api/webhooks/shipping/[provider]/route.ts → shipping.handleWebhook(params.provider, req)
```

### Furgonetka (1. implementacja)
- Broker — jedna integracja = InPost (Paczkomaty), DPD, DHL, Poczta, GLS itd.
- OAuth2 (client credentials). `getRates` z paczek, `createShipment` → etykieta PDF do
  storage adaptera, `getPickupPoints` dla widgetu Paczkomatów w checkoucie.
- ENV: `FURGONETKA_CLIENT_ID`, `FURGONETKA_CLIENT_SECRET`, `FURGONETKA_ACCOUNT`,
  (`FURGONETKA_WEBHOOK_SECRET` jeśli dostępny).

**Dodanie kolejnego przewoźnika/brokera później** = nowa klasa `CarrierProvider` + wpis w
rejestrze + ENV. Checkout i panel bez zmian.

## Storage plików — `modules/media`

```ts
export interface StorageAdapter {
  getUploadUrl(key: string, contentType: string): Promise<{ url: string; fields?: Record<string,string> }>;
  getPublicUrl(key: string): string;
  delete(key: string): Promise<void>;
}
```

- Implementacja **S3-compatible** (AWS SDK v3) — działa z MinIO (Coolify) i AWS/Cloudflare R2
  (Vercel). Ta sama klasa, inne ENV.
- Upload bezpośrednio z przeglądarki przez presigned URL (nie obciąża app serwera → działa
  serverless).
- `next/image` z custom loaderem na `getPublicUrl`.
- ENV: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`,
  `S3_PUBLIC_URL`.

## Email — `modules/notifications`

```ts
export interface EmailAdapter {
  send(input: { to: string; subject: string; react?: ReactElement; html?: string }): Promise<void>;
}
```

- Domyślnie **Resend** (proste) lub **SMTP** (nodemailer) dla self-hosted/Coolify.
- Szablony jako React Email (potwierdzenie zamówienia, wysyłka, reset hasła, faktura).
- ENV: `EMAIL_PROVIDER`, `RESEND_API_KEY` lub `SMTP_*`, `EMAIL_FROM`.

## Kolejka / zadania w tle — `modules/jobs`

By zostać przenośnym (Vercel nie ma trwałych workerów):

```ts
export interface JobQueue {
  enqueue(name: string, payload: unknown, opts?: { delayMs?: number }): Promise<void>;
}
```

- **Domyślnie**: tryb „inline" (wykonanie od razu) + endpointy cron (Vercel Cron / Coolify
  scheduler) dla zadań okresowych (czyszczenie koszyków, przypomnienia).
- **Coolify**: można podmienić na BullMQ + Redis bez zmiany kodu wołającego.
- Zastosowania: wysyłka maili, rewalidacja, generowanie faktur, sync magazynu.

## Konfiguracja środowiska (`lib/env.ts`)

- Walidacja ENV przez Zod przy starcie (fail-fast).
- `.env.example` z kompletem zmiennych + opisem.
- Feature flags: `FEATURE_MARKETING`, `FEATURE_CMS`, `FEATURE_MULTIREGION`, `FEATURE_DIGITAL`.

## Dlaczego to czyni z tego dobry template
- Wymiana SaaS = jedna klasa + ENV, zero zmian w logice domenowej.
- Storefront/admin UI generowalne (Stitch) na stabilnym kontrakcie services.
- Hosting-agnostyczny: ten sam kod na Coolify (Docker) i Vercel.
