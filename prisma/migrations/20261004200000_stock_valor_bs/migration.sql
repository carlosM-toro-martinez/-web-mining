-- Valor en Bs del stock físico para el kardex con CPP móvil (CPP vigente = valorBs / cantidad).
-- Solo agrega la columna; el valor inicial lo asigna el script scripts/cpp-movil/recalcular-mes.ts.

-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "valorBs" DECIMAL(14,2) NOT NULL DEFAULT 0;
