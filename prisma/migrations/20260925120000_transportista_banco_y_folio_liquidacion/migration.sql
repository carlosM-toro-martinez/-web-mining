-- Datos bancarios del transportista (para reproducir fielmente la
-- Liquidación real, que muestra Banco + Número de cuenta del contratista).
ALTER TABLE "Transportista" ADD COLUMN "banco" TEXT;
ALTER TABLE "Transportista" ADD COLUMN "numeroCuenta" TEXT;

-- Folio del documento de Liquidación ("Nº 81", "Nº 86"): un único contador
-- global asignado recién al cerrar, nunca en el borrador.
ALTER TABLE "LiquidacionPeriodo" ADD COLUMN "numero" INTEGER;
CREATE UNIQUE INDEX "LiquidacionPeriodo_numero_key" ON "LiquidacionPeriodo"("numero");
