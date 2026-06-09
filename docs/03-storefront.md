# 03 — Sklep (storefront) — szkic stron

Strony publiczne. Każda lista funkcji/danych jest gotowa pod podpięcie do services; wygląd
generujemy później (Stitch) i wstawiamy w te ramy. Renderowanie głównie RSC; interaktywne
fragmenty (koszyk, dodaj-do-koszyka, filtry) jako Client Components.

## Routing

```
/                       Strona główna
/products               Lista/katalog (z filtrami)
/category/[slug]        Produkty kategorii
/collection/[slug]      Kolekcja
/product/[slug]         Karta produktu
/search                 Wyniki wyszukiwania
/cart                   Koszyk
/checkout               Proces zamówienia (multi-step)
/checkout/success       Potwierdzenie po płatności
/account                Panel klienta (chroniony)
  /account/orders
  /account/orders/[id]
  /account/addresses
  /account/wishlist
  /account/profile
/auth/login
/auth/register
/auth/forgot
/p/[slug]               Strona CMS (regulamin, FAQ...)
/blog                   Lista wpisów
/blog/[slug]            Wpis
```

## Strony — zawartość

### Home (`/`)
- Hero (z `Banner key="hero"`), promo-strip.
- Sekcje: polecane kolekcje, nowości, bestsellery, kategorie.
- Newsletter (jeśli marketing).
- Dane z: `Collection`, `Product` (ACTIVE), `Banner`, `Category`.

### Katalog (`/products`, `/category/[slug]`, `/collection/[slug]`)
- Siatka produktów + paginacja.
- Filtry (URL-driven): kategoria, brand, cena (zakres), opcje (rozmiar/kolor), dostępność.
- Sortowanie: cena ↑/↓, najnowsze, popularność.
- Karta produktu w siatce: zdjęcie, tytuł, cena (+ compareAt), badge promocji/wyprzedane.

### Karta produktu (`/product/[slug]`)
- Galeria zdjęć.
- Tytuł, cena (wariantowa), opis, brand.
- **Wybór wariantu** (opcje → aktywny wariant, cena, stan).
- Przycisk „Dodaj do koszyka" (+ ilość), „Do listy życzeń".
- Dostępność / niski stan / wyprzedane.
- Recenzje (średnia + lista APPROVED) + formularz (zalogowani).
- Powiązane produkty.
- SEO: meta z produktu, JSON-LD Product.

### Koszyk (`/cart`)
- Lista linii (miniatura, wariant, cena, ilość ±, usuń).
- Pole kodu rabatowego (walidacja przez `discounts` service).
- Podsumowanie: subtotal, rabat, szac. wysyłka, total.
- CTA „Przejdź do kasy". Stan pusty.

### Checkout (`/checkout`) — kroki
1. **Kontakt** (email; logowanie opcjonalne / gość).
2. **Dostawa** (adres + wybór `ShippingMethod`; **stała cena** metody przez
   `shipping.options`, bez wywołań API przewoźnika). Gdy metoda `requiresPickupPoint`
   → **widget wyboru Paczkomatu/punktu** (`getPickupPoints`), wybrany punkt zapisany
   na zamówieniu.
3. **Płatność** (wybór providera → adapter; np. Stripe Payment Element).
4. **Podsumowanie** i złożenie zamówienia.
- Po sukcesie: redirect/webhook potwierdza płatność → `Order` PAID → `/checkout/success`.
- Stany błędów płatności obsłużone (powrót do kroku płatności).

### Konto klienta (`/account/**`)
- Dashboard: ostatnie zamówienia, skróty.
- Zamówienia: lista + szczegóły (status, śledzenie, pozycje, ponów zakup).
- Adresy: CRUD, domyślny.
- Lista życzeń: produkty, „do koszyka".
- Profil: dane, zmiana hasła, zgody/newsletter.

### Auth (`/auth/*`)
- Logowanie (email+hasło / OAuth), rejestracja, reset hasła. Auth.js.

### CMS / Blog
- `/p/[slug]` — strona statyczna (Page PUBLISHED).
- `/blog`, `/blog/[slug]` — wpisy PUBLISHED.

## Elementy współdzielone (layout)
- Header: logo, menu kategorii (mega-menu), wyszukiwarka, ikona konta, koszyk (licznik).
- Footer: linki CMS, kontakt, newsletter, metody płatności.
- Drawer koszyka (mini-cart) po dodaniu produktu.
- Komponent ceny (formatowanie waluty z `currency`).
- Komponenty: ProductCard, VariantPicker, QuantityStepper, Rating, Pagination, FilterBar.

## Wydajność / SEO
- ISR/`revalidate` na katalogu i kartach produktu; rewalidacja po zmianie w adminie
  (`revalidateTag`).
- `sitemap.ts`, `robots.ts`, Open Graph, JSON-LD (Product, BreadcrumbList).
- Obrazy przez `next/image` + storage adapter (S3/MinIO loader).

## Przepływ „dodaj do koszyka → zamówienie"
```
ProductPage → addToCart(variantId,qty)  [service: cart.addLine]
  → Cart (DB, cookie cartId dla gościa)
Cart → applyDiscount?  [service: discounts.validate]
Checkout → setAddress
  → shipping.options(cart,address) [stałe ceny metod, bez API]
  → setShipping (+ pickupPoint jeśli wymagany)
  → payments.createSession(order)  [adapter → stripe]
  → użytkownik płaci
Webhook /api/webhooks/stripe → payments.handleWebhook
  → order.markPaid + inventory.commitReservation + email potwierdzenie
Success page
```
