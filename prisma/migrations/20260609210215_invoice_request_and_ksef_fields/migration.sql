-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "buyerNip" TEXT,
ADD COLUMN     "invoiceRequested" BOOLEAN NOT NULL DEFAULT false;
