-- CreateEnum
CREATE TYPE "TipoPersonal" AS ENUM ('OBRERO', 'TECNICO_EMPLEADO');

-- AlterTable: add tipoPersonal column with default OBRERO for all existing employees
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "tipoPersonal" "TipoPersonal" NOT NULL DEFAULT 'OBRERO';
