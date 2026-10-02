-- CreateEnum
CREATE TYPE "TipoCombustibleViaje" AS ENUM ('CON_COMBUSTIBLE', 'SIN_COMBUSTIBLE');

-- AlterTable
ALTER TABLE "TarifaLiquidacion" ADD COLUMN     "incluyeCombustible" "TipoCombustibleViaje";

-- AlterTable
ALTER TABLE "LoteDespacho" ADD COLUMN     "incluyeCombustible" "TipoCombustibleViaje" NOT NULL DEFAULT 'SIN_COMBUSTIBLE';
