-- DropIndex
DROP INDEX "RendicionDetalleGasto_gastoId_key";

-- CreateIndex
CREATE INDEX "RendicionDetalleGasto_gastoId_idx" ON "RendicionDetalleGasto"("gastoId");

-- CreateIndex
CREATE UNIQUE INDEX "RendicionDetalleGasto_rendicionId_gastoId_key" ON "RendicionDetalleGasto"("rendicionId", "gastoId");
