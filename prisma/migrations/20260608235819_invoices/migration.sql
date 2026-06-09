-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('VAT', 'NO_VAT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "InvoiceType" NOT NULL DEFAULT 'VAT',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "seller" JSONB NOT NULL,
    "buyer" JSONB NOT NULL,
    "buyerNip" TEXT,
    "netAmount" INTEGER NOT NULL DEFAULT 0,
    "vatAmount" INTEGER NOT NULL DEFAULT 0,
    "grossAmount" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitNet" INTEGER NOT NULL,
    "unitGross" INTEGER NOT NULL,
    "vatRate" INTEGER NOT NULL,
    "net" INTEGER NOT NULL,
    "vat" INTEGER NOT NULL,
    "gross" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
