-- CreateEnum (idempotente: no falla si el tipo ya existe)
DO $$ BEGIN
  CREATE TYPE "TipoPersonal" AS ENUM ('OBRERO', 'TECNICO_EMPLEADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: add tipoPersonal column with default OBRERO for all existing employees
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "tipoPersonal" "TipoPersonal" NOT NULL DEFAULT 'OBRERO';
