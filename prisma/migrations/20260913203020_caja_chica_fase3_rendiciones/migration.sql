-- CreateEnum
CREATE TYPE "EstadoRendicionCaja" AS ENUM ('BORRADOR', 'CERRADO', 'ANULADO');

-- CreateTable
CREATE TABLE "RendicionCaja" (
    "id" TEXT NOT NULL,
    "cajaId" INTEGER NOT NULL,
    "periodoDesde" TIMESTAMP(3) NOT NULL,
    "periodoHasta" TIMESTAMP(3) NOT NULL,
    "numero" TEXT NOT NULL,
    "tipoCambio" DECIMAL(10,4) NOT NULL,
    "estado" "EstadoRendicionCaja" NOT NULL DEFAULT 'BORRADOR',
    "totalFondos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalGastos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalRetenciones" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCreditoFiscal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saldoAnterior" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saldoNuevo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RendicionCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RendicionDetalleGasto" (
    "id" TEXT NOT NULL,
    "rendicionId" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "montoIncluido" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "RendicionDetalleGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnulacionRendicionCaja" (
    "id" TEXT NOT NULL,
    "rendicionId" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnulacionRendicionCaja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RendicionCaja_numero_key" ON "RendicionCaja"("numero");

-- CreateIndex
CREATE INDEX "RendicionCaja_cajaId_idx" ON "RendicionCaja"("cajaId");

-- CreateIndex
CREATE INDEX "RendicionCaja_estado_idx" ON "RendicionCaja"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "RendicionDetalleGasto_gastoId_key" ON "RendicionDetalleGasto"("gastoId");

-- CreateIndex
CREATE INDEX "RendicionDetalleGasto_rendicionId_idx" ON "RendicionDetalleGasto"("rendicionId");

-- CreateIndex
CREATE UNIQUE INDEX "AnulacionRendicionCaja_rendicionId_key" ON "AnulacionRendicionCaja"("rendicionId");

-- AddForeignKey
ALTER TABLE "RendicionCaja" ADD CONSTRAINT "RendicionCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaChica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendicionCaja" ADD CONSTRAINT "RendicionCaja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendicionDetalleGasto" ADD CONSTRAINT "RendicionDetalleGasto_rendicionId_fkey" FOREIGN KEY ("rendicionId") REFERENCES "RendicionCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendicionDetalleGasto" ADD CONSTRAINT "RendicionDetalleGasto_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "GastoCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionRendicionCaja" ADD CONSTRAINT "AnulacionRendicionCaja_rendicionId_fkey" FOREIGN KEY ("rendicionId") REFERENCES "RendicionCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionRendicionCaja" ADD CONSTRAINT "AnulacionRendicionCaja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
