-- DropForeignKey
ALTER TABLE "GastoCaja" DROP CONSTRAINT "GastoCaja_centroCostoCajaId_fkey";

-- DropForeignKey
ALTER TABLE "GastoCaja" DROP CONSTRAINT "GastoCaja_funcionGastoCajaId_fkey";

-- AlterTable
ALTER TABLE "GastoCaja" ALTER COLUMN "centroCostoCajaId" DROP NOT NULL,
ALTER COLUMN "funcionGastoCajaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_centroCostoCajaId_fkey" FOREIGN KEY ("centroCostoCajaId") REFERENCES "CentroCostoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoCaja" ADD CONSTRAINT "GastoCaja_funcionGastoCajaId_fkey" FOREIGN KEY ("funcionGastoCajaId") REFERENCES "FuncionGastoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
