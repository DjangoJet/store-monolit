# 01 — Struktura danych (Prisma / PostgreSQL)

Schemat docelowy dla v1. Pogrupowany domenowo. Konwencje:

- PK: `id` jako `cuid()` (przenośne, sortowalne wystarczająco, bez wycieku liczby rekordów).
- Czas: `createdAt` / `updatedAt` wszędzie.
- Pieniądze: przechowywane jako **liczby całkowite w groszach** (`Int`), nigdy `Float`.
  Pole `currency` (ISO 4217) towarzyszy kwotom.
- Soft-delete: `deletedAt DateTime?` na encjach, które admin może „usuwać" (produkty,
  kategorie), zamiast twardego DELETE.
- Wielojęzyczność (opcjonalna): pola tekstowe tłumaczone trzymane w tabeli `*Translation`
  gdy `FEATURE_MULTIREGION` (na start: pola wprost na encji).

> Poniżej skrót w formie Prisma. To kontrakt danych — UI generujemy później pod te pola.

## Auth & użytkownicy

```prisma
enum Role { CUSTOMER STAFF ADMIN }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailVerified DateTime?
  passwordHash  String?            // null = logowanie tylko OAuth
  name          String?
  phone         String?
  role          Role     @default(CUSTOMER)
  isActive      Boolean  @default(true)

  accounts      Account[]          // Auth.js OAuth
  sessions      Session[]          // Auth.js
  addresses     Address[]
  orders        Order[]
  cart          Cart?
  reviews       Review[]
  wishlist      WishlistItem[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Tabele Account / Session / VerificationToken wg schematu Auth.js (NextAuth v5)

model Address {
  id         String  @id @default(cuid())
  userId     String
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       String  @default("shipping") // shipping | billing
  isDefault  Boolean @default(false)
  firstName  String
  lastName   String
  company    String?
  line1      String
  line2      String?
  city       String
  postalCode String
  country    String  // ISO 3166-1 alpha-2
  phone      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## Katalog: produkty, warianty, kategorie

Model: **Product** (encja marketingowa) → **ProductVariant** (to, co się kupuje i ma SKU
oraz stan). Produkt prosty = 1 wariant domyślny.

```prisma
model Product {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  subtitle    String?
  description String?  @db.Text      // może być MD/HTML z edytora
  status      ProductStatus @default(DRAFT) // DRAFT | ACTIVE | ARCHIVED
  type        ProductType   @default(PHYSICAL) // PHYSICAL | DIGITAL
  brandId     String?
  brand       Brand?   @relation(fields: [brandId], references: [id])

  // SEO
  metaTitle       String?
  metaDescription String?

  categories  CategoryProduct[]
  collections CollectionProduct[]
  variants    ProductVariant[]
  options     ProductOption[]    // np. "Rozmiar", "Kolor"
  images      ProductImage[]
  reviews     Review[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  @@index([status])
}

enum ProductStatus { DRAFT ACTIVE ARCHIVED }
enum ProductType   { PHYSICAL DIGITAL }

model ProductOption {              // oś wariantowania
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  name      String                  // "Rozmiar"
  position  Int     @default(0)
  values    ProductOptionValue[]
}

model ProductOptionValue {
  id       String @id @default(cuid())
  optionId String
  option   ProductOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  value    String                   // "M", "Czerwony"
  position Int    @default(0)
  variants VariantOptionValue[]
}

model ProductVariant {
  id          String  @id @default(cuid())
  productId   String
  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku         String? @unique
  barcode     String?
  title       String                 // "M / Czerwony"
  priceAmount Int                    // grosze
  currency    String  @default("PLN")
  compareAtAmount Int?               // cena przed promocją
  weightGrams Int?
  lengthMm    Int?                   // opcjonalne wymiary — podpowiedź dla admina przy paczce
  widthMm     Int?
  heightMm    Int?
  position    Int     @default(0)

  optionValues VariantOptionValue[]
  inventory   InventoryItem?
  orderLines  OrderLine[]
  cartLines   CartLine[]
  digitalAsset DigitalAsset?         // gdy product.type = DIGITAL

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([productId])
}

model VariantOptionValue {          // tabela łącząca wariant ↔ wartości opcji
  variantId     String
  variant       ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  optionValueId String
  optionValue   ProductOptionValue @relation(fields: [optionValueId], references: [id], onDelete: Cascade)
  @@id([variantId, optionValueId])
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String                   // klucz/URL ze storage adaptera
  alt       String?
  position  Int     @default(0)
}

model Brand {
  id       String @id @default(cuid())
  slug     String @unique
  name     String
  logoUrl  String?
  products Product[]
}

model Category {                    // drzewo (parent/child)
  id        String  @id @default(cuid())
  slug      String  @unique
  name      String
  description String?
  parentId  String?
  parent    Category? @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  imageUrl  String?
  position  Int     @default(0)
  products  CategoryProduct[]
  deletedAt DateTime?
}

model CategoryProduct {
  categoryId String
  productId  String
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@id([categoryId, productId])
}

model Collection {                  // np. "Nowości", "Bestsellery", kuratorska
  id        String  @id @default(cuid())
  slug      String  @unique
  title     String
  description String?
  isAutomatic Boolean @default(false) // reguły vs. ręczna
  products  CollectionProduct[]
}

model CollectionProduct {
  collectionId String
  productId    String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  product      Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@id([collectionId, productId])
}
```

## Magazyn

```prisma
model InventoryItem {
  id          String @id @default(cuid())
  variantId   String @unique
  variant     ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  quantity    Int    @default(0)   // dostępne fizycznie
  reserved    Int    @default(0)   // zarezerwowane przez niezapłacone zamówienia
  trackInventory Boolean @default(true)
  allowBackorder Boolean @default(false)
  lowStockThreshold Int? 
  updatedAt   DateTime @updatedAt
}
// available = quantity - reserved
```

## Koszyk

Koszyk żyje w DB (gość = po `id` w cookie, zalogowany = po `userId`). Po zalogowaniu koszyki
się scalają.

```prisma
model Cart {
  id         String   @id @default(cuid())
  userId     String?  @unique
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  currency   String   @default("PLN")
  email      String?                  // dla gościa
  lines      CartLine[]
  discountCode String?
  expiresAt  DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model CartLine {
  id        String @id @default(cuid())
  cartId    String
  cart      Cart   @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  quantity  Int
  // cena liczona na bieżąco z wariantu; snapshot dopiero w zamówieniu
  @@unique([cartId, variantId])
}
```

## Zamówienia

Zamówienie = **snapshot** danych w chwili zakupu (ceny, adresy, nazwy). Nie zależy od
późniejszych zmian produktów. Płatność i status śledzone osobno.

```prisma
model Order {
  id            String   @id @default(cuid())
  number        String   @unique          // czytelny, np. "2026-000123"
  userId        String?
  user          User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  email         String

  status        OrderStatus    @default(PENDING)
  paymentStatus PaymentStatus  @default(UNPAID)
  fulfillmentStatus FulfillmentStatus @default(UNFULFILLED)

  currency      String
  subtotalAmount Int                       // suma linii przed rabatem
  discountAmount Int   @default(0)
  shippingAmount Int   @default(0)
  taxAmount      Int   @default(0)
  totalAmount    Int                       // do zapłaty

  // adresy jako snapshot (JSON lub osobne pola)
  shippingAddress Json?
  billingAddress  Json?

  discountCode   String?
  shippingMethod String?
  shippingPickupPoint Json?               // wybrany Paczkomat/punkt (snapshot)
  customerNote   String?
  adminNote      String?

  lines       OrderLine[]
  payments    Payment[]
  shipments   Shipment[]
  events      OrderEvent[]      // historia/audyt

  placedAt    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
  @@index([userId])
}

enum OrderStatus       { PENDING CONFIRMED CANCELLED COMPLETED }
enum PaymentStatus     { UNPAID AUTHORIZED PAID PARTIALLY_REFUNDED REFUNDED FAILED }
enum FulfillmentStatus { UNFULFILLED PARTIALLY_FULFILLED FULFILLED RETURNED }

model OrderLine {
  id          String @id @default(cuid())
  orderId     String
  order       Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId   String?
  variant     ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  // snapshot:
  productTitle String
  variantTitle String
  sku          String?
  unitAmount   Int
  quantity     Int
  totalAmount  Int
}

model OrderEvent {                  // audyt/timeline w panelu
  id        String @id @default(cuid())
  orderId   String
  order     Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  type      String                  // "created","paid","shipped","note","status_change"
  message   String?
  data      Json?
  actorId   String?                 // kto (admin/system)
  createdAt DateTime @default(now())
}
```

## Płatności (powiązanie z adapterem)

```prisma
model Payment {
  id           String  @id @default(cuid())
  orderId      String
  order        Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  provider     String                  // "stripe","przelewy24",...
  providerRef  String?                 // np. PaymentIntent id
  status       PaymentStatus
  amount       Int
  currency     String
  rawPayload   Json?                   // ostatni webhook (debug/audyt)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  refunds      Refund[]
  @@index([providerRef])
}

model Refund {
  id         String  @id @default(cuid())
  paymentId  String
  payment    Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  amount     Int
  reason     String?
  providerRef String?
  createdAt  DateTime @default(now())
}
```

## Wysyłka

```prisma
model ShippingZone {
  id        String @id @default(cuid())
  name      String
  countries String[]                 // ISO alpha-2
  methods   ShippingMethod[]
}

model ShippingMethod {
  id        String @id @default(cuid())
  zoneId    String
  zone      ShippingZone @relation(fields: [zoneId], references: [id], onDelete: Cascade)
  name      String                  // "Kurier", "Paczkomat"
  provider  String  @default("manual") // "manual" | "furgonetka" | ... (do realizacji etykiety)
  serviceCode String?               // domyślna usługa przewoźnika (np. "inpost_locker")
  requiresPickupPoint Boolean @default(false) // np. Paczkomat
  priceAmount Int                    // STAŁA cena pokazywana i pobierana od klienta
  currency  String @default("PLN")
  freeOver  Int?                    // darmowa wysyłka powyżej kwoty
  minDays   Int?
  maxDays   Int?
  isActive  Boolean @default(true)
  position  Int     @default(0)
}
// Cena dla klienta = priceAmount (FLAT). Faktyczny koszt przewoźnika liczony osobno
// po stronie admina przy tworzeniu Shipment (wymiary paczki → getRates) — patrz Shipment.costAmount.

model Shipment {
  id          String @id @default(cuid())
  orderId     String
  order       Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  provider    String  @default("manual") // przez którego adaptera utworzona
  carrier     String?                 // faktyczny przewoźnik (InPost, DPD...)
  serviceCode String?
  providerRef String?                 // id przesyłki u brokera/przewoźnika
  status      ShipmentStatus @default(CREATED)
  trackingNumber String?
  trackingUrl String?
  labelUrl    String?                 // etykieta PDF w storage
  pickupPoint Json?                    // wybrany punkt odbioru (snapshot)
  parcels     Json?                    // wymiary/waga paczek ustalone przez admina
  costAmount  Int?                     // FAKTYCZNY koszt przewoźnika (grosze) — do marży/raportów
  costCurrency String?                 // (≠ cena pobrana od klienta = Order.shippingAmount)
  shippedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([providerRef])
}
enum ShipmentStatus { CREATED LABEL_READY IN_TRANSIT DELIVERED RETURNED CANCELLED }
```

## Marketing: rabaty, recenzje, wishlist

```prisma
model Discount {
  id          String @id @default(cuid())
  code        String @unique
  description String?
  type        DiscountType            // PERCENT | FIXED | FREE_SHIPPING
  value       Int                     // % lub grosze
  currency    String?
  minSubtotal Int?
  startsAt    DateTime?
  endsAt      DateTime?
  usageLimit  Int?                    // globalny limit użyć
  usageCount  Int     @default(0)
  perUserLimit Int?
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
}
enum DiscountType { PERCENT FIXED FREE_SHIPPING }

model Review {
  id        String @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId    String?
  user      User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  rating    Int                       // 1..5
  title     String?
  body      String? @db.Text
  status    ReviewStatus @default(PENDING) // moderacja
  createdAt DateTime @default(now())
  @@index([productId, status])
}
enum ReviewStatus { PENDING APPROVED REJECTED }

model WishlistItem {
  id        String @id @default(cuid())
  userId    String
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  createdAt DateTime @default(now())
  @@unique([userId, productId])
}

model NewsletterSubscriber {
  id        String @id @default(cuid())
  email     String @unique
  confirmed Boolean @default(false)
  createdAt DateTime @default(now())
}
```

## Produkty cyfrowe (gotowe, za flagą)

```prisma
model DigitalAsset {
  id         String @id @default(cuid())
  variantId  String @unique
  variant    ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  fileKey    String                  // klucz w storage
  fileName   String
  maxDownloads Int?
}
```

## CMS / treści

```prisma
model Page {                         // strony statyczne: regulamin, FAQ...
  id        String @id @default(cuid())
  slug      String @unique
  title     String
  body      String @db.Text          // MD/rich text
  status    String @default("DRAFT") // DRAFT | PUBLISHED
  metaTitle String?
  metaDescription String?
  updatedAt DateTime @updatedAt
}

model BlogPost {
  id          String @id @default(cuid())
  slug        String @unique
  title       String
  excerpt     String?
  body        String @db.Text
  coverUrl    String?
  status      String @default("DRAFT")
  publishedAt DateTime?
  authorId    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Banner {                       // edytowalne sekcje strony głównej
  id        String @id @default(cuid())
  key       String @unique           // "hero", "promo-strip"
  title     String?
  subtitle  String?
  imageUrl  String?
  linkUrl   String?
  isActive  Boolean @default(true)
  position  Int     @default(0)
}

model Setting {                      // konfiguracja sklepu (klucz-wartość)
  key       String @id              // "store.name","store.currency","tax.rate"
  value     Json
  updatedAt DateTime @updatedAt
}

model MediaAsset {                   // biblioteka mediów (uploady)
  id        String @id @default(cuid())
  key       String @unique
  url       String
  mimeType  String
  sizeBytes Int
  width     Int?
  height    Int?
  createdAt DateTime @default(now())
}
```

## Multi-region (gotowe, za flagą)

W v1 jedna waluta/region. Pod `FEATURE_MULTIREGION` dochodzi:

- `Currency`, `Region`, `TaxRate` — strefy podatkowe i waluty,
- ceny per-region (`PriceList` / `VariantPrice`),
- tabele `*Translation` dla tekstów (Product, Category, Page, BlogPost).

Zostawione jako rozszerzenie, by nie komplikować startu — pola `currency` już są wszędzie.
