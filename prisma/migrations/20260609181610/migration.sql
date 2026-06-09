-- CreateEnum
CREATE TYPE "KsefStatus" AS ENUM ('NOT_SENT', 'PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "ksefError" TEXT,
ADD COLUMN     "ksefNumber" TEXT,
ADD COLUMN     "ksefReference" TEXT,
ADD COLUMN     "ksefSentAt" TIMESTAMP(3),
ADD COLUMN     "ksefStatus" "KsefStatus" NOT NULL DEFAULT 'NOT_SENT',
ADD COLUMN     "ksefUpoXml" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_ksefStatus_idx" ON "Invoice"("ksefStatus");
