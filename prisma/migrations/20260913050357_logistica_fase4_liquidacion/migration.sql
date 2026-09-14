-- CreateEnum
CREATE TYPE "TipoPeriodoLiquidacion" AS ENUM ('SEMANAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('BORRADOR', 'CERRADO', 'ANULADO');

-- CreateTable
CREATE TABLE "LiquidacionPeriodo" (
    "id" TEXT NOT NULL,
    "remitenteId" INTEGER NOT NULL,
    "tipoPeriodo" "TipoPeriodoLiquidacion" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'BORRADOR',
    "totalBruto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAbonos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalDeducciones" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalNeto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiquidacionPeriodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidacionDetalleLote" (
    "id" TEXT NOT NULL,
    "liquidacionId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "tonelajeNeto" DECIMAL(10,3) NOT NULL,
    "precioAplicado" DECIMAL(14,6) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "LiquidacionDetalleLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidacionItemConcepto" (
    "id" TEXT NOT NULL,
    "liquidacionId" TEXT NOT NULL,
    "conceptoId" INTEGER NOT NULL,
    "descripcion" TEXT,
    "monto" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "LiquidacionItemConcepto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnulacionLiquidacion" (
    "id" TEXT NOT NULL,
    "liquidacionId" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnulacionLiquidacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiquidacionPeriodo_remitenteId_idx" ON "LiquidacionPeriodo"("remitenteId");

-- CreateIndex
CREATE INDEX "LiquidacionPeriodo_estado_idx" ON "LiquidacionPeriodo"("estado");

-- CreateIndex
CREATE INDEX "LiquidacionDetalleLote_liquidacionId_idx" ON "LiquidacionDetalleLote"("liquidacionId");

-- CreateIndex
CREATE INDEX "LiquidacionDetalleLote_loteId_idx" ON "LiquidacionDetalleLote"("loteId");

-- CreateIndex
CREATE INDEX "LiquidacionItemConcepto_liquidacionId_idx" ON "LiquidacionItemConcepto"("liquidacionId");

-- CreateIndex
CREATE UNIQUE INDEX "AnulacionLiquidacion_liquidacionId_key" ON "AnulacionLiquidacion"("liquidacionId");

-- AddForeignKey
ALTER TABLE "LiquidacionPeriodo" ADD CONSTRAINT "LiquidacionPeriodo_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "Remitente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionPeriodo" ADD CONSTRAINT "LiquidacionPeriodo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionDetalleLote" ADD CONSTRAINT "LiquidacionDetalleLote_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "LiquidacionPeriodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionDetalleLote" ADD CONSTRAINT "LiquidacionDetalleLote_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteDespacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionItemConcepto" ADD CONSTRAINT "LiquidacionItemConcepto_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "LiquidacionPeriodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidacionItemConcepto" ADD CONSTRAINT "LiquidacionItemConcepto_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "ConceptoLiquidacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionLiquidacion" ADD CONSTRAINT "AnulacionLiquidacion_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "LiquidacionPeriodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionLiquidacion" ADD CONSTRAINT "AnulacionLiquidacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
