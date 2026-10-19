-- CreateEnum
CREATE TYPE "TipoContratacion" AS ENUM ('PLANTA', 'CONTRATO');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "contratacion" "TipoContratacion" NOT NULL DEFAULT 'PLANTA';
