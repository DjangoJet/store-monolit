-- Sekwencja numerów zamówień: atomowa, bez wyścigu (dotąd COUNT(*)+1 w aplikacji).
-- Start od maksymalnego istniejącego sufiksu numeru (format RRRR-NNNNNN).
CREATE SEQUENCE "order_number_seq";
SELECT setval(
  'order_number_seq',
  COALESCE((SELECT MAX(split_part("number", '-', 2)::bigint) FROM "Order"), 0) + 1,
  false
);

-- Niezgadywalny token publiczny zamówienia (strona sukcesu) + backfill istniejących wierszy.
ALTER TABLE "Order" ADD COLUMN "publicToken" TEXT;
UPDATE "Order" SET "publicToken" = md5(random()::text || clock_timestamp()::text || id);
ALTER TABLE "Order" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");
