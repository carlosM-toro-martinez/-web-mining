-- Add cantidadReservada to Stock for approved-vale reservation tracking
ALTER TABLE "Stock" ADD COLUMN IF NOT EXISTS "cantidadReservada" DECIMAL(12,2) NOT NULL DEFAULT 0;
