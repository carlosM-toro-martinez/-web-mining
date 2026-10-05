-- Un lote anulado ya no retiene su número de Conocimiento: pasa a
-- "N/MM ANULADO" (sigue en el historial) y el "N/MM" queda libre para el
-- próximo lote de ese mes (ver generarCorrelativoLote en correlativo.ts).
UPDATE "LoteDespacho"
SET "correlativo" = "correlativo" || ' ANULADO'
WHERE "estadoLote" = 'ANULADO' AND "correlativo" NOT LIKE '% ANULADO%';

-- Caso real de octubre 2026: se anuló el 27/10 y el viaje se volvió a
-- registrar como 28/10. Se lo corre al 27/10 para que la serie quede
-- seguida. Solo si los datos están exactamente así (28/10 es el último del
-- mes); si no, no hace nada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "LoteDespacho" WHERE "correlativo" = '27/10 ANULADO' AND "anio" = 2026)
     AND NOT EXISTS (SELECT 1 FROM "LoteDespacho" WHERE "correlativo" = '27/10' AND "anio" = 2026)
     AND EXISTS (SELECT 1 FROM "LoteDespacho" WHERE "correlativo" = '28/10' AND "anio" = 2026 AND "estadoLote" <> 'ANULADO')
     AND NOT EXISTS (
       SELECT 1 FROM "LoteDespacho"
       WHERE "anio" = 2026 AND "correlativo" ~ '^[0-9]+/10$' AND split_part("correlativo", '/', 1)::int > 28
     )
  THEN
    UPDATE "LoteDespacho" SET "correlativo" = '27/10' WHERE "correlativo" = '28/10' AND "anio" = 2026;
    UPDATE "CorrelativoContador" SET "ultimoNumero" = 27, "updatedAt" = now()
    WHERE "clave" = 'LOTE_DESPACHO_2026_10' AND "ultimoNumero" = 28;
  END IF;
END $$;
