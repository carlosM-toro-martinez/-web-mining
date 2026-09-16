-- CreateEnum
CREATE TYPE "OrigenGastoCaja" AS ENUM ('CAJA', 'BANCO');

-- DropForeignKey
ALTER TABLE "GastoCaja" DROP CONSTRAINT "GastoCaja_cajaId_fkey";

-- AlterTable
ALTER TABLE "GastoCaja" ADD COLUMN     "cuentaBancariaCajaId" INTEGER,
ADD COLUMN     "origen" "OrigenGastoCaja" NOT NULL DEFAULT 'CAJA',
ALTER COLUMN "cajaId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "GastoCaja_cuentaBancariaCajaId_idx" ON "GastoCaja"("cuentaBancariaCajaId");

-- AddForeignKey
ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaChica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_cuentaBancariaCajaId_fkey" FOREIGN KEY ("cuentaBancariaCajaId") REFERENCES "CuentaBancariaCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
