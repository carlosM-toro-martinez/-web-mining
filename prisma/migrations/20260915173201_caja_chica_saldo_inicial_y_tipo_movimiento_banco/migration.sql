-- CreateEnum
CREATE TYPE "TipoMovimientoBanco" AS ENUM ('INGRESO', 'SALIDA_A_CAJA');

-- DropForeignKey
ALTER TABLE "MovimientoBancoCaja" DROP CONSTRAINT "MovimientoBancoCaja_cajaId_fkey";

-- AlterTable
ALTER TABLE "CajaChica" ADD COLUMN     "saldoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CuentaBancariaCaja" ADD COLUMN     "saldoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MovimientoBancoCaja" ADD COLUMN     "tipo" "TipoMovimientoBanco" NOT NULL DEFAULT 'SALIDA_A_CAJA',
ALTER COLUMN "cajaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MovimientoBancoCaja" ADD CONSTRAINT "MovimientoBancoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaChica"("id") ON DELETE SET NULL ON UPDATE CASCADE;
