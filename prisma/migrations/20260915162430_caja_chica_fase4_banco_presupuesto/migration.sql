-- CreateEnum
CREATE TYPE "FormaPagoBanco" AS ENUM ('DEPOSITO', 'CHEQUE', 'TRANSFERENCIA');

-- AlterTable
ALTER TABLE "GastoCaja" ADD COLUMN     "partidaPresupuestoId" INTEGER;

-- CreateTable
CREATE TABLE "CuentaBancariaCaja" (
    "id" SERIAL NOT NULL,
    "banco" TEXT NOT NULL,
    "numeroCuenta" TEXT,
    "nombreCuenta" TEXT NOT NULL,
    "monedaBase" "MonedaCaja" NOT NULL DEFAULT 'BOB',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CuentaBancariaCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidaPresupuestoCaja" (
    "id" SERIAL NOT NULL,
    "cajaId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "montoPresupuestado" DECIMAL(14,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartidaPresupuestoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoBancoCaja" (
    "id" TEXT NOT NULL,
    "cuentaBancariaId" INTEGER NOT NULL,
    "cajaId" INTEGER NOT NULL,
    "partidaPresupuestoId" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL,
    "formaPago" "FormaPagoBanco" NOT NULL,
    "numeroCheque" TEXT,
    "monto" DECIMAL(14,2) NOT NULL,
    "moneda" "MonedaCaja" NOT NULL,
    "depositanteNombre" TEXT,
    "descripcion" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoBancoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartidaPresupuestoCaja_cajaId_anio_mes_idx" ON "PartidaPresupuestoCaja"("cajaId", "anio", "mes");

-- CreateIndex
CREATE INDEX "MovimientoBancoCaja_cajaId_idx" ON "MovimientoBancoCaja"("cajaId");

-- CreateIndex
CREATE INDEX "MovimientoBancoCaja_cuentaBancariaId_idx" ON "MovimientoBancoCaja"("cuentaBancariaId");

-- AddForeignKey
ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_partidaPresupuestoId_fkey" FOREIGN KEY ("partidaPresupuestoId") REFERENCES "PartidaPresupuestoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPresupuestoCaja" ADD CONSTRAINT "PartidaPresupuestoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaChica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoBancoCaja" ADD CONSTRAINT "MovimientoBancoCaja_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "CuentaBancariaCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoBancoCaja" ADD CONSTRAINT "MovimientoBancoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaChica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoBancoCaja" ADD CONSTRAINT "MovimientoBancoCaja_partidaPresupuestoId_fkey" FOREIGN KEY ("partidaPresupuestoId") REFERENCES "PartidaPresupuestoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoBancoCaja" ADD CONSTRAINT "MovimientoBancoCaja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
