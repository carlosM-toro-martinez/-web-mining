-- Add cargo column to Employee table (was missing from initial migration)
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "cargo" TEXT;

-- Add missing indexes on AsistenciaLog
CREATE INDEX IF NOT EXISTS "AsistenciaLog_fecha_idx" ON "AsistenciaLog"("fecha");
CREATE INDEX IF NOT EXISTS "AsistenciaLog_employeeId_idx" ON "AsistenciaLog"("employeeId");

-- Add unique constraint on AsistenciaLog (deviceUserId, fecha)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AsistenciaLog_deviceUserId_fecha_key'
  ) THEN
    ALTER TABLE "AsistenciaLog" ADD CONSTRAINT "AsistenciaLog_deviceUserId_fecha_key" UNIQUE ("deviceUserId", "fecha");
  END IF;
END $$;
