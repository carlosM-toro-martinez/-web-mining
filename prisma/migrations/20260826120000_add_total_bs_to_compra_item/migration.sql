-- AlterTable: agregar totalBs a CompraItem para guardar el total exacto ingresado por el usuario
-- Evita errores de redondeo cuando precioUnit = totalIngresado / cantidad tiene decimal periódico
ALTER TABLE "CompraItem" ADD COLUMN IF NOT EXISTS "totalBs" DECIMAL(14,2);
