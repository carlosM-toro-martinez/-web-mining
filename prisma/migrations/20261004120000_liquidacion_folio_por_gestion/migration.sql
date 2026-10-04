-- Folio de la liquidación por gestión minera ("Nº 01/27"): el correlativo se
-- reinicia cada gestión, así que la unicidad pasa a ser (numero, gestion).

-- DropIndex
DROP INDEX "LiquidacionPeriodo_numero_key";

-- AlterTable
ALTER TABLE "LiquidacionPeriodo" ADD COLUMN     "gestion" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "LiquidacionPeriodo_numero_gestion_key" ON "LiquidacionPeriodo"("numero", "gestion");
