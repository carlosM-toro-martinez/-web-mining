-- Marca de factura de combustible: su crédito fiscal IVA se calcula sobre
-- el 70% del importe facturado.

-- AlterTable
ALTER TABLE "GastoCaja" ADD COLUMN     "esCombustible" BOOLEAN NOT NULL DEFAULT false;
