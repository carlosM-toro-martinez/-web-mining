-- CreateEnum (idempotente: no falla si el tipo ya existe)
DO $$ BEGIN
  CREATE TYPE "CondicionEpp" AS ENUM ('NUEVO', 'EN_USO', 'DEVUELTO_BUENO', 'DEVUELTO_USADO', 'BAJA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "EppAsignacion"
  ADD COLUMN IF NOT EXISTS "condicion" "CondicionEpp" NOT NULL DEFAULT 'EN_USO',
  ADD COLUMN IF NOT EXISTS "observacion" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EppAsignacion_productoId_idx" ON "EppAsignacion"("productoId");
CREATE INDEX IF NOT EXISTS "EppAsignacion_usuarioId_idx" ON "EppAsignacion"("usuarioId");
