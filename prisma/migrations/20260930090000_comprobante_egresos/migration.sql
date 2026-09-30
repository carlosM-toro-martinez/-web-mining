-- AlterTable
ALTER TABLE "CuentaBancariaCaja" ADD COLUMN     "cuentaContableCajaId" INTEGER;

-- AlterTable
ALTER TABLE "GastoCaja" ADD COLUMN     "numeroComprobante" INTEGER;

-- AlterTable
ALTER TABLE "LiquidacionPeriodo" ADD COLUMN     "numeroComprobante" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "GastoCaja_numeroComprobante_key" ON "GastoCaja"("numeroComprobante");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidacionPeriodo_numeroComprobante_key" ON "LiquidacionPeriodo"("numeroComprobante");

-- AddForeignKey
ALTER TABLE "CuentaBancariaCaja" ADD CONSTRAINT "CuentaBancariaCaja_cuentaContableCajaId_fkey" FOREIGN KEY ("cuentaContableCajaId") REFERENCES "CuentaContableCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
