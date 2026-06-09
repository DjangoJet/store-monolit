# 02 — Panel administracyjny

Dostęp: tylko `STAFF` i `ADMIN` (RBAC guard na `/admin/**` w middleware + sprawdzenie roli
w layout). Layout: lewy sidebar z nawigacją, górny pasek (wyszukiwarka globalna, konto,
przełącznik sklepu jeśli multi-store w przyszłości), główny obszar treści.

UI generujemy później (Stitch) — tu definiujemy **co** ma być i **jakie akcje** (każdy ekran
podpina się do gotowego service z `modules/*`).

## Mapa nawigacji

```
/admin
  /dashboard            KPI, ostatnie zamówienia, niski stan, wykresy
  /orders               lista + filtry
    /orders/[id]        szczegóły zamówienia (centrum operacyjne)
  /products             lista produktów
    /products/new       kreator produktu
    /products/[id]      edycja: warianty, ceny, media, magazyn, SEO
  /categories           drzewo kategorii (drag&drop)
  /collections          kolekcje
  /inventory            stany magazynowe (bulk edit)
  /customers            lista klientów
    /customers/[id]     profil: zamówienia, adresy, notatki
  /discounts            kody rabatowe / promocje
  /reviews              moderacja recenzji
  /content
    /content/pages      strony statyczne
    /content/blog        wpisy blogowe
    /content/banners     sekcje strony głównej
    /content/media       biblioteka mediów
  /shipping             strefy i metody wysyłki
  /settings
    /settings/general    nazwa, logo, dane firmy, waluta
    /settings/payments   konfiguracja providerów płatności
    /settings/taxes      stawki podatkowe
    /settings/staff      użytkownicy panelu i role
    /settings/integrations  email, analytics, webhooki
```

## Ekrany — zawartość i akcje

### Dashboard
- KPI (dziś/7 dni/30 dni): sprzedaż, liczba zamówień, śr. wartość koszyka, konwersja.
- Wykres sprzedaży w czasie.
- Listy: ostatnie zamówienia, produkty z niskim stanem, oczekujące recenzje.
- Skróty: „Dodaj produkt", „Nowy rabat".

### Zamówienia — lista
- Kolumny: numer, data, klient, total, status płatności, status realizacji.
- Filtry: status, płatność, realizacja, zakres dat, wyszukiwanie (numer/email).
- Akcje masowe: oznacz jako zrealizowane, eksport CSV.

### Zamówienie — szczegóły (najważniejszy ekran operacyjny)
- Pozycje zamówienia (snapshot), kwoty (subtotal/rabat/wysyłka/podatek/total).
- Dane klienta + adresy.
- **Płatność**: status, historia `Payment`/`Refund`, akcja „Zwróć" (przez adapter).
- **Realizacja**: utwórz `Shipment` przez adapter (Furgonetka) — ustaw **wymiary/wagę paczki**
  (podpowiedź z wariantów + domyślna paczka, możliwość nadpisania), **podejrzyj faktyczny
  koszt** (`estimateCost` → `getRates`), wybierz usługę, wygeneruj **etykietę** (PDF do
  storage) + numer/tracking; lub ręcznie (provider `manual`). Koszt zapisany w
  `Shipment.costAmount` (do marży; ≠ cena pobrana od klienta). Statusy aktualizowane
  webhookiem/cronem.
- **Timeline** (`OrderEvent`): pełna historia + notatki admina.
- Akcje: zmień status, anuluj, wyślij ponownie potwierdzenie e-mail, drukuj.

### Produkty — lista
- Miniatura, tytuł, status, typ, cena (zakres), stan łączny, kategorie.
- Filtry: status, kategoria, brand, „niski stan". Wyszukiwarka.
- Akcje masowe: zmiana statusu, przypisanie kategorii, usuń (soft).

### Produkt — edycja (sekcje/zakładki)
1. **Podstawowe**: tytuł, slug, opis (rich text), brand, status, typ.
2. **Media**: upload + sortowanie (storage adapter), alt-y.
3. **Warianty**: definiowanie opcji (Rozmiar/Kolor) → generowanie wariantów; per-wariant
   SKU, cena, compareAt, waga.
4. **Magazyn**: stan per wariant, śledzenie, backorder, próg niskiego stanu.
5. **Organizacja**: kategorie, kolekcje.
6. **SEO**: meta title/description, podgląd snippetu.
7. (DIGITAL) **Plik cyfrowy**: upload assetu, limit pobrań.

### Kategorie / Kolekcje
- Drzewo kategorii z drag&drop (parent/child, kolejność), obrazek.
- Kolekcje ręczne lub automatyczne (reguły) — v1: ręczne.

### Magazyn
- Tabela wszystkich wariantów: dostępne (=quantity-reserved), zarezerwowane, próg.
- Edycja inline + import/eksport CSV.

### Klienci
- Lista: nazwa, email, liczba zamówień, suma wydatków, data rejestracji.
- Profil: dane, adresy, historia zamówień, notatki, ręczne resetowanie hasła/blokada.

### Rabaty
- Tworzenie kodu: typ (%, kwota, darmowa wysyłka), wartość, warunki (min. koszyk, daty,
  limity globalne/na użytkownika), aktywność.
- Podgląd wykorzystania (`usageCount`).

### Recenzje
- Kolejka moderacji: PENDING → APPROVED/REJECTED. Filtry, wyszukiwanie.

### Treści (CMS)
- **Strony**: edytor rich text, slug, status, SEO.
- **Blog**: jak strony + cover, excerpt, data publikacji.
- **Bannery**: edycja sekcji strony głównej (hero, promo) — klucz, obraz, link, aktywność.
- **Media**: biblioteka uploadów (lista, podgląd, usuwanie, kopiuj URL).

### Wysyłka
- Strefy (kraje) → metody (cena, darmowa od kwoty, czas dostawy, aktywność).
- Per metoda: **stała cena dla klienta** (`priceAmount`), provider (`manual`/`furgonetka`),
  domyślny `serviceCode`, `requiresPickupPoint`, darmowa od kwoty.
- „Domyślna paczka" (wymiary/waga) do podpowiedzi przy realizacji.
- Konfiguracja konta przewoźnika w `settings/integrations` (klucze Furgonetki).

### Ustawienia
- **Ogólne**: nazwa sklepu, logo, dane firmy, domyślna waluta/strefa.
- **Płatności**: włącz/skonfiguruj providerów (Stripe klucze itd.) — patrz adaptery.
- **Podatki**: stawka(i) VAT.
- **Personel**: zaproszenia, role STAFF/ADMIN.
- **Integracje**: email (Resend/SMTP), analytics, sekrety webhooków.

## Wzorce wspólne dla wszystkich list

- Server-side: paginacja, sortowanie, filtry w URL (shareable).
- Server Actions do mutacji + optymistyczne UI gdzie sensowne.
- Toaster na potwierdzenia, dialog na akcje destrukcyjne.
- Każda mutacja loguje `OrderEvent`/audyt gdzie dotyczy.

## RBAC (uprawnienia)

| Obszar           | STAFF | ADMIN |
|------------------|-------|-------|
| Zamówienia       | ✅    | ✅    |
| Produkty/Katalog | ✅    | ✅    |
| Klienci          | ✅    | ✅    |
| Rabaty/Treści    | ✅    | ✅    |
| Ustawienia/Personel/Płatności | ❌ | ✅ |

Guard w `server/rbac.ts` (np. `requireRole("ADMIN")`) wołany w Server Actions i layoutach.
