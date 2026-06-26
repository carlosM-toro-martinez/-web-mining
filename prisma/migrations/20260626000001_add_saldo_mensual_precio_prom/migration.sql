-- AlterTable: Add weighted-average price columns to SaldoMensual
ALTER TABLE "SaldoMensual"
  ADD COLUMN "ingresosBs"     DECIMAL(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN "precioUnitProm" DECIMAL(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN "totalBsProm"    DECIMAL(14,4) NOT NULL DEFAULT 0;
