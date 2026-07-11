-- Ampliar precisión de precioUnit y precioProm de Decimal(12,2) a Decimal(14,6)
-- Operación segura: ampliar precisión nunca pierde datos (valores existentes como
-- 123.45 simplemente se almacenan como 123.450000).

ALTER TABLE "Stock"
  ALTER COLUMN "precioUnit" TYPE DECIMAL(14,6) USING "precioUnit"::DECIMAL(14,6),
  ALTER COLUMN "precioProm" TYPE DECIMAL(14,6) USING "precioProm"::DECIMAL(14,6);

ALTER TABLE "Movimiento"
  ALTER COLUMN "precioUnit" TYPE DECIMAL(14,6) USING "precioUnit"::DECIMAL(14,6);

ALTER TABLE "CompraItem"
  ALTER COLUMN "precioUnit" TYPE DECIMAL(14,6) USING "precioUnit"::DECIMAL(14,6);
