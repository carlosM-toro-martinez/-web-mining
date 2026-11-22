-- Cuatro entregas del banco a la caja se registraron con el año 2006 en vez de
-- 2026: quedaban antes de todo rango, restaban 790.413,12 del saldo inicial y no
-- aparecían en noviembre. Solo se corrige el año (mismo mes y día).
UPDATE "MovimientoBancoCaja"
SET "fecha" = "fecha" + INTERVAL '20 years'
WHERE "tipo" = 'SALIDA_A_CAJA'
  AND "anulado" = false
  AND "fecha" >= '2006-11-01' AND "fecha" < '2006-12-01';
