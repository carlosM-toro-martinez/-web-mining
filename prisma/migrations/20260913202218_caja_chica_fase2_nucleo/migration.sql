-- CreateEnum
CREATE TYPE "TipoDocumentoGasto" AS ENUM ('FACTURA', 'CONTRATO_RETENCION', 'RECIBO_DIRECTO');

-- CreateEnum
CREATE TYPE "CategoriaRetencionGasto" AS ENUM ('SERVICIO', 'COMPRA');

-- CreateEnum
CREATE TYPE "EstadoGastoCaja" AS ENUM ('REGISTRADO', 'RENDIDO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoMovimientoFondoCaja" AS ENUM ('REMESA_PRESUPUESTO', 'REMESA_SUELDOS', 'REMESA_OTROS', 'REPOSICION');

-- CreateTable
CREATE TABLE "GastoCaja" (
    "id" TEXT NOT NULL,
    "cajaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipoDocumento" "TipoDocumentoGasto" NOT NULL,
    "categoriaRetencion" "CategoriaRetencionGasto",
    "proveedorNombre" TEXT NOT NULL,
    "proveedorNitCi" TEXT,
    "glosa" TEXT NOT NULL,
    "numeroRespaldo" TEXT,
    "montoTotal" DECIMAL(14,2) NOT NULL,
    "moneda" "MonedaCaja" NOT NULL,
    "centroCostoCajaId" INTEGER NOT NULL,
    "funcionGastoCajaId" INTEGER NOT NULL,
    "cuentaContableCajaId" INTEGER,
    "montoCreditoFiscalIva" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "montoRetencionRcIva" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "montoRetencionIueCompras" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "montoRetencionIt" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "esNoDeducible" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoGastoCaja" NOT NULL DEFAULT 'REGISTRADO',
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GastoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnulacionGastoCaja" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnulacionGastoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoFondoCaja" (
    "id" TEXT NOT NULL,
    "cajaId" INTEGER NOT NULL,
    "tipo" "TipoMovimientoFondoCaja" NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "moneda" "MonedaCaja" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "referencia" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoFondoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GastoCaja_cajaId_idx" ON "GastoCaja"("cajaId");

-- CreateIndex
CREATE INDEX "GastoCaja_estado_idx" ON "GastoCaja"("estado");

-- CreateIndex
CREATE INDEX "GastoCaja_fecha_idx" ON "GastoCaja"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "AnulacionGastoCaja_gastoId_key" ON "AnulacionGastoCaja"("gastoId");

-- CreateIndex
CREATE INDEX "MovimientoFondoCaja_cajaId_idx" ON "MovimientoFondoCaja"("cajaId");

-- AddForeignKey
ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaChica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_centroCostoCajaId_fkey" FOREIGN KEY ("centroCostoCajaId") REFERENCES "CentroCostoCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_funcionGastoCajaId_fkey" FOREIGN KEY ("funcionGastoCajaId") REFERENCES "FuncionGastoCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_cuentaContableCajaId_fkey" FOREIGN KEY ("cuentaContableCajaId") REFERENCES "CuentaContableCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionGastoCaja" ADD CONSTRAINT "AnulacionGastoCaja_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "GastoCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionGastoCaja" ADD CONSTRAINT "AnulacionGastoCaja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoFondoCaja" ADD CONSTRAINT "MovimientoFondoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaChica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoFondoCaja" ADD CONSTRAINT "MovimientoFondoCaja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
