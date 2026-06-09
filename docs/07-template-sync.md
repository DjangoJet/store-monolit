# 07 — Nowe sklepy i synchronizacja z template

Jak zakładać sklepy na bazie `store-monolit` i jak utrzymywać przepływ zmian w obie strony:
generyczne ulepszenia → wracają do template; specyfika sklepu → zostaje w sklepie.

Uzupełnia `docs/06-template-usage.md` (konfiguracja, deploy). Tu chodzi o **workflow gita**.

---

## Zasada nadrzędna

Rozdzielaj świadomie dwa rodzaje zmian:

| Należy do TEMPLATE (generyczne) | Tylko w SKLEPIE (specyficzne) |
|---|---|
| nowy moduł `src/modules/*` | `.env` (klucze, flagi) |
| komponenty UI, adaptery, logika | branding: `src/app/layout.tsx` (metadata), `src/app/globals.css` |
| migracje wspólnego schematu | treść seeda, `Setting "store.*"`, logo, teksty |
| poprawki bugów, testy | konkretne integracje/konta |

Architektura już to wspiera: **moduły są samowystarczalne** (`src/modules/<x>/` + flaga
`FEATURE_<X>`), więc nowy moduł to przede wszystkim *nowe pliki* → przenosi się bez konfliktów.
Specyfika sklepu żyje poza logiką (env / seed / Setting / CSS / metadata).

---

## Wybór startu: clone vs degit

- **Chcesz aktualizować sklep o nowości z template (dwukierunkowo)** → `git clone`
  z template jako remote. **TEN sposób** opisany niżej.
- **Jednorazowy sklep bez późniejszej synchronizacji** → `npx degit ...` (czysty start,
  brak wspólnej historii — nic nie wepchniesz z powrotem). Patrz `docs/06`.

---

## Setup nowego sklepu (z synchronizacją)

```bash
git clone git@github.com:ty/store-monolit.git moj-sklep
cd moj-sklep
git remote rename origin template          # 'template' = wspólne źródło
git remote add origin git@github.com:ty/moj-sklep.git
git push -u origin main                     # własne repo sklepu
```

Masz dwa zdalne: `template` (wspólny kod) i `origin` (ten sklep).

Dalej standardowa konfiguracja (`docs/06`): `npm install`, `.env`, `db:migrate`, `db:seed`.

**Co podmienić pod sklep:** `package.json:name`, `layout.tsx` metadata, `Setting "store.name"`,
klucze w `.env`, flagi `FEATURE_*`, kolory w `globals.css`. (Nie wstrzykuj brandingu w moduły!)

---

## Workflow A — moduł od razu generyczny (zalecany)

Wiesz, że feature jest do template? Rób go **w repo template**, a do sklepu ściągnij:

```bash
# repo template: dodaj moduł, commit, push
# w sklepie:
git fetch template
git merge template/main      # lub: git rebase template/main
npm install                  # gdy zmienił się package.json
npm run db:migrate           # gdy doszły migracje
```

---

## Workflow B — moduł powstał w sklepie, „awansujesz" go do template

Klucz to **higiena commitów**: zmianę generyczną trzymaj osobno od brandingu.

```bash
# w sklepie: branch z czystą, generyczną zmianą wyrośnięty z template/main
git fetch template
git checkout -b feat/nazwa-modulu template/main
# ...kodujesz moduł (nowe pliki + minimalne dopięcia)...
git commit -m "feat: nazwa modułu"

# wepchnij do template (→ PR) i wmerguj do sklepu:
git push template feat/nazwa-modulu
git checkout main && git merge feat/nazwa-modulu
```

Gdy zmiana jest już wymieszana na branchu sklepu — wybierz pojedyncze commity:

```bash
# w repo template:
git remote add moj-sklep git@github.com:ty/moj-sklep.git
git fetch moj-sklep
git cherry-pick <sha-generycznego-commita>
```

---

## Aktualizacja istniejących sklepów o nowości z template

```bash
cd dowolny-sklep
git fetch template
git merge template/main      # rozwiąż ewentualne konflikty (zwykle pliki współdzielone)
npm install                  # jeśli zmienił się package.json / lockfile
npm run db:migrate           # jeśli doszły migracje
npm run test && npm run build # sanity check
```

---

## Konwencje minimalizujące konflikty

1. **Nowy moduł = nowe pliki.** Logika w `src/modules/<x>/`, wyłączalna flagą `FEATURE_<X>`
   (`src/lib/env.ts` + `src/lib/config.ts`). Merge takiego modułu jest bezkonfliktowy.
2. **Pliki współdzielone dotykaj minimalnie i addytywnie.** Konflikty powstają niemal wyłącznie tu:
   - `prisma/schema.prisma` (dodawaj modele/pola na końcu, nie przepisuj istniejących),
   - `src/app/admin/layout.tsx` (lista `NAV` — dopisuj pozycje),
   - `src/lib/env.ts` (nowe zmienne env), `src/lib/config.ts` (nowe flagi),
   - nawigacja storefrontu `src/app/(shop)/layout.tsx`.
3. **Commity rozdzielaj po naturze:** `feat(template): …` vs `chore(shop): …`.
   Ułatwia cherry-pick i `git log --grep "template"`.
4. **Migracje są addytywne i niezmienne.** Nowy moduł dokłada migrację; nigdy nie edytuj
   wstecznie zastosowanych migracji. W sklepie po mergu: `npm run db:migrate`.
5. **Specyfika sklepu poza kodem logiki:** `.env`, `Setting`, `prisma/seed.ts`, `globals.css`,
   `metadata`. Dzięki temu merge template nigdy nie nadpisze brandingu.

---

## Anatomia „dobrego" modułu (wzorzec do kopiowania)

Tak wygląda moduł, który łatwo przenosić między template a sklepami:

```
src/modules/<nazwa>/
  service.ts      # logika domenowa + Prisma (czyste funkcje, testowalne)
  actions.ts      # 'use server' — server actions (requireRole gdzie trzeba) + revalidate
  schemas.ts      # walidacja Zod (współdzielona client/server)
  types.ts        # (opcjonalnie) kontrakt adaptera, jeśli integracja zewnętrzna
src/app/.../<ui>  # cienkie widoki wołające wyłącznie service/actions
```

Dopięcia poza modułem (świadome, minimalne):
- flaga `FEATURE_<X>` w `env.ts` + `config.ts`,
- model(e) w `schema.prisma` + migracja,
- ewentualny link w nawigacji admina/sklepu.

Im więcej logiki w `modules/<x>/` i im mniej dopięć w plikach współdzielonych, tym czystsza
synchronizacja. Wzorce na żywo: `src/modules/discounts`, `reviews`, `wishlist` (Faza 5).
```
