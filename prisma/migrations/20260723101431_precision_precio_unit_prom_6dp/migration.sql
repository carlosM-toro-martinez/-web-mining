-- AlterTable: aumentar precisión de precioUnitProm y totalBsProm de 4 a 6 decimales
-- para evitar el artifact de -0.01 en inventario-almacen cuando salidaQty × CPP_4dp ≠ ingresosBs
ALTER TABLE "SaldoMensual" ALTER COLUMN "precioUnitProm" TYPE DECIMAL(14,6);
ALTER TABLE "SaldoMensual" ALTER COLUMN "totalBsProm" TYPE DECIMAL(14,6);
