-- Corrección de fechas para lotes 28/10 – 78/10 importados con fecha errónea.
-- El parser leyó "02/10/2026" como M/D (Feb 10) y luego la corrección por mes
-- lo dejó en Oct 10 en vez de Oct 2. Lo mismo para 05/10 y 06/10.
--
-- Grupos según el Excel:
--   28/10 – 42/10  →  2026-10-02
--   43/10 – 62/10  →  2026-10-05
--   63/10 – 78/10  →  2026-10-06
--
-- Ejecutar en prod con:
--   psql $DATABASE_URL -f prisma/fix_fechas_octubre.sql
-- o desde Prisma Studio / DBeaver copiando el bloque completo.
-- Es idempotente: correrlo dos veces no rompe nada.

BEGIN;

-- 1. LoteDespacho (fechaDespachoReal y fechaDocumentalFiscal)
UPDATE "LoteDespacho"
SET
  "fechaDespachoReal"      = '2026-10-02 00:00:00 UTC',
  "fechaDocumentalFiscal"  = '2026-10-02 00:00:00 UTC'
WHERE "anio" = 2026
  AND "correlativo" ~ '^[0-9]+/10$'
  AND split_part("correlativo", '/', 1)::int BETWEEN 28 AND 42;

UPDATE "LoteDespacho"
SET
  "fechaDespachoReal"      = '2026-10-05 00:00:00 UTC',
  "fechaDocumentalFiscal"  = '2026-10-05 00:00:00 UTC'
WHERE "anio" = 2026
  AND "correlativo" ~ '^[0-9]+/10$'
  AND split_part("correlativo", '/', 1)::int BETWEEN 43 AND 62;

UPDATE "LoteDespacho"
SET
  "fechaDespachoReal"      = '2026-10-06 00:00:00 UTC',
  "fechaDocumentalFiscal"  = '2026-10-06 00:00:00 UTC'
WHERE "anio" = 2026
  AND "correlativo" ~ '^[0-9]+/10$'
  AND split_part("correlativo", '/', 1)::int BETWEEN 63 AND 78;

-- 2. ConocimientoCarga (fecha del conocimiento físico)
UPDATE "ConocimientoCarga" cc
SET "fecha" = '2026-10-02 00:00:00 UTC'
FROM "LoteDespacho" l
WHERE cc."loteId" = l."id"
  AND l."anio" = 2026
  AND l."correlativo" ~ '^[0-9]+/10$'
  AND split_part(l."correlativo", '/', 1)::int BETWEEN 28 AND 42;

UPDATE "ConocimientoCarga" cc
SET "fecha" = '2026-10-05 00:00:00 UTC'
FROM "LoteDespacho" l
WHERE cc."loteId" = l."id"
  AND l."anio" = 2026
  AND l."correlativo" ~ '^[0-9]+/10$'
  AND split_part(l."correlativo", '/', 1)::int BETWEEN 43 AND 62;

UPDATE "ConocimientoCarga" cc
SET "fecha" = '2026-10-06 00:00:00 UTC'
FROM "LoteDespacho" l
WHERE cc."loteId" = l."id"
  AND l."anio" = 2026
  AND l."correlativo" ~ '^[0-9]+/10$'
  AND split_part(l."correlativo", '/', 1)::int BETWEEN 63 AND 78;

-- 3. PesajeIngenio (fecha del pesaje — solo los que tienen pesaje)
UPDATE "PesajeIngenio" pi
SET "fechaPesaje" = '2026-10-02 00:00:00 UTC'
FROM "LoteDespacho" l
WHERE pi."loteId" = l."id"
  AND l."anio" = 2026
  AND l."correlativo" ~ '^[0-9]+/10$'
  AND split_part(l."correlativo", '/', 1)::int BETWEEN 28 AND 42;

UPDATE "PesajeIngenio" pi
SET "fechaPesaje" = '2026-10-05 00:00:00 UTC'
FROM "LoteDespacho" l
WHERE pi."loteId" = l."id"
  AND l."anio" = 2026
  AND l."correlativo" ~ '^[0-9]+/10$'
  AND split_part(l."correlativo", '/', 1)::int BETWEEN 43 AND 62;

UPDATE "PesajeIngenio" pi
SET "fechaPesaje" = '2026-10-06 00:00:00 UTC'
FROM "LoteDespacho" l
WHERE pi."loteId" = l."id"
  AND l."anio" = 2026
  AND l."correlativo" ~ '^[0-9]+/10$'
  AND split_part(l."correlativo", '/', 1)::int BETWEEN 63 AND 78;

-- Verificación: muestra los correlativos y fechas resultantes
SELECT
  l."correlativo",
  l."fechaDespachoReal"::date AS "despacho",
  cc."fecha"::date             AS "conocimiento",
  pi."fechaPesaje"::date       AS "pesaje",
  l."estadoLote"
FROM "LoteDespacho" l
LEFT JOIN "ConocimientoCarga" cc ON cc."loteId" = l."id"
LEFT JOIN "PesajeIngenio"     pi ON pi."loteId" = l."id"
WHERE l."anio" = 2026
  AND l."correlativo" ~ '^[0-9]+/10$'
  AND split_part(l."correlativo", '/', 1)::int BETWEEN 28 AND 78
ORDER BY split_part(l."correlativo", '/', 1)::int;

COMMIT;
