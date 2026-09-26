-- El correlativo del lote pasa a usar el formato real confirmado por el
-- usuario contra el Conocimiento físico ("53/09" = correlativo 53 emitido
-- en septiembre): un único contador compartido por TODA la mina que se
-- reinicia cada mes. Como ese mismo texto se repite cada año, la unicidad
-- ya no puede depender solo del string "correlativo" — se agrega "anio" y
-- la unicidad real pasa a ser (correlativo, anio).
--
-- Los lotes ya existentes (formato viejo "LT-2026-000001") NO se renombran;
-- solo se les rellena "anio" a partir de su fechaDespachoReal para que la
-- nueva constraint compuesta los acepte sin conflicto.

DROP INDEX "LoteDespacho_correlativo_key";

ALTER TABLE "LoteDespacho" ADD COLUMN "anio" INTEGER;

UPDATE "LoteDespacho" SET "anio" = EXTRACT(YEAR FROM "fechaDespachoReal")::int;

ALTER TABLE "LoteDespacho" ALTER COLUMN "anio" SET NOT NULL;

CREATE UNIQUE INDEX "LoteDespacho_correlativo_anio_key" ON "LoteDespacho"("correlativo", "anio");
