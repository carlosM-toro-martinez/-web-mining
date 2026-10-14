-- AlterEnum
ALTER TYPE "TipoMovimientoFondoCaja" ADD VALUE 'AJUSTE_CUADRE';

-- AlterEnum
ALTER TYPE "TipoMovimientoBanco" ADD VALUE 'AJUSTE_CUADRE';

-- CreateTable
CREATE TABLE "CuadreSaldoCaja" (
    "id" TEXT NOT NULL,
    "cajaId" INTEGER,
    "cuentaBancariaId" INTEGER,
    "fechaCorte" TIMESTAMP(3) NOT NULL,
    "saldoSistema" DECIMAL(14,2) NOT NULL,
    "saldoReal" DECIMAL(14,2) NOT NULL,
    "diferencia" DECIMAL(14,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "movimientoFondoId" TEXT,
    "movimientoBancoId" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuadreSaldoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuadreSaldoCaja_movimientoFondoId_key" ON "CuadreSaldoCaja"("movimientoFondoId");

-- CreateIndex
CREATE UNIQUE INDEX "CuadreSaldoCaja_movimientoBancoId_key" ON "CuadreSaldoCaja"("movimientoBancoId");

-- CreateIndex
CREATE INDEX "CuadreSaldoCaja_cajaId_fechaCorte_idx" ON "CuadreSaldoCaja"("cajaId", "fechaCorte");

-- CreateIndex
CREATE INDEX "CuadreSaldoCaja_cuentaBancariaId_fechaCorte_idx" ON "CuadreSaldoCaja"("cuentaBancariaId", "fechaCorte");

-- AddForeignKey
ALTER TABLE "CuadreSaldoCaja" ADD CONSTRAINT "CuadreSaldoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaChica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuadreSaldoCaja" ADD CONSTRAINT "CuadreSaldoCaja_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "CuentaBancariaCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuadreSaldoCaja" ADD CONSTRAINT "CuadreSaldoCaja_movimientoFondoId_fkey" FOREIGN KEY ("movimientoFondoId") REFERENCES "MovimientoFondoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuadreSaldoCaja" ADD CONSTRAINT "CuadreSaldoCaja_movimientoBancoId_fkey" FOREIGN KEY ("movimientoBancoId") REFERENCES "MovimientoBancoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuadreSaldoCaja" ADD CONSTRAINT "CuadreSaldoCaja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

