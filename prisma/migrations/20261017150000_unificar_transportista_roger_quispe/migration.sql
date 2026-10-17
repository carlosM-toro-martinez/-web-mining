-- Unificación de datos (sin cambios de esquema): "ROGER QUISPE" y "ROGER QUISPE MIRANDA" son la misma
-- persona y quedaron como dos transportistas.
--
-- Origen: la semilla de Logística creó primero "ROGER QUISPE" (con sus 12 volquetas) y después se renombró
-- en el código a "ROGER QUISPE MIRANDA". Como la semilla busca por nombre, creó un transportista nuevo y
-- dejó el viejo con todas las volquetas. Desde entonces los lotes que se cargan eligiendo la volqueta
-- salen a nombre del viejo y los que vienen del Excel (columna Propietario) a nombre del nuevo.
--
-- Qué hace (todo en una sola transacción; si algo falla no cambia nada):
--   1. Se queda con "ROGER QUISPE MIRANDA" (el nombre de la semilla y del Excel). Si solo existiera el
--      viejo, lo renombra a ese nombre.
--   2. Pasa al que se queda: lotes, volquetas, liquidaciones y tarifas del duplicado.
--   3. Si el que se queda tiene NIT/banco/cuenta vacíos o de relleno, toma los del duplicado.
--   4. Elimina el duplicado y deja una fila en "Log" con lo que se movió.
--
-- Es idempotente: si ya no hay duplicado, no hace nada. El nombre se compara sin importar mayúsculas ni
-- espacios de más.

DO $$
DECLARE
  nombre_correcto CONSTANT text := 'ROGER QUISPE MIRANDA';
  nombre_viejo    CONSTANT text := 'ROGER QUISPE';
  keeper_id int;
  dup       RECORD;
  keeper    RECORD;
  n_lotes int;
  n_vehiculos int;
  n_liquidaciones int;
  n_tarifas int;
BEGIN
  -- 1. Transportista que se queda: el que ya tiene el nombre correcto (si hubiera varios, el de más lotes).
  SELECT t."id" INTO keeper_id
  FROM "Transportista" t
  WHERE regexp_replace(upper(btrim(t."nombreORazonSocial")), '\s+', ' ', 'g') = nombre_correcto
  ORDER BY (SELECT count(*) FROM "LoteDespacho" l WHERE l."transportistaId" = t."id") DESC, t."id"
  LIMIT 1;

  IF keeper_id IS NULL THEN
    -- Solo existe el nombre viejo: se renombra el más antiguo y los demás (si hay) se unen a él.
    SELECT t."id" INTO keeper_id
    FROM "Transportista" t
    WHERE regexp_replace(upper(btrim(t."nombreORazonSocial")), '\s+', ' ', 'g') = nombre_viejo
    ORDER BY t."id"
    LIMIT 1;

    IF keeper_id IS NULL THEN
      RAISE NOTICE 'Unificar ROGER QUISPE: no hay transportistas con ese nombre, no se hace nada.';
      RETURN;
    END IF;

    UPDATE "Transportista"
    SET "nombreORazonSocial" = nombre_correcto,
        "nitOCi" = CASE WHEN "nitOCi" = 'PENDIENTE-ROGER-QUISPE' THEN 'PENDIENTE-ROGER-QUISPE-MIRANDA' ELSE "nitOCi" END
    WHERE "id" = keeper_id;
  END IF;

  -- 2. Duplicados: cualquier otro transportista con el nombre viejo o con el correcto.
  FOR dup IN
    SELECT t.*
    FROM "Transportista" t
    WHERE t."id" <> keeper_id
      AND regexp_replace(upper(btrim(t."nombreORazonSocial")), '\s+', ' ', 'g') IN (nombre_viejo, nombre_correcto)
    ORDER BY t."id"
  LOOP
    SELECT * INTO keeper FROM "Transportista" WHERE "id" = keeper_id;

    IF dup."tipoEntidad" <> keeper."tipoEntidad" THEN
      RAISE NOTICE 'Unificar ROGER QUISPE: el duplicado % era % y el que se queda (%) es %; se conserva el del que se queda.',
        dup."id", dup."tipoEntidad", keeper_id, keeper."tipoEntidad";
    END IF;

    UPDATE "LoteDespacho" SET "transportistaId" = keeper_id WHERE "transportistaId" = dup."id";
    GET DIAGNOSTICS n_lotes = ROW_COUNT;
    UPDATE "Vehiculo" SET "propietarioId" = keeper_id WHERE "propietarioId" = dup."id";
    GET DIAGNOSTICS n_vehiculos = ROW_COUNT;
    UPDATE "LiquidacionPeriodo" SET "transportistaId" = keeper_id WHERE "transportistaId" = dup."id";
    GET DIAGNOSTICS n_liquidaciones = ROW_COUNT;
    UPDATE "TarifaLiquidacion" SET "transportistaId" = keeper_id WHERE "transportistaId" = dup."id";
    GET DIAGNOSTICS n_tarifas = ROW_COUNT;

    -- 3. Datos que el que se queda no tenga (NIT de relleno, banco, cuenta, cuenta contable).
    UPDATE "Transportista" k
    SET "nitOCi" = CASE
          WHEN k."nitOCi" LIKE 'PENDIENTE-%' AND dup."nitOCi" NOT LIKE 'PENDIENTE-%' THEN dup."nitOCi"
          ELSE k."nitOCi"
        END,
        "banco" = COALESCE(NULLIF(btrim(k."banco"), ''), dup."banco"),
        "numeroCuenta" = COALESCE(NULLIF(btrim(k."numeroCuenta"), ''), dup."numeroCuenta"),
        "cuentaContableId" = COALESCE(k."cuentaContableId", dup."cuentaContableId"),
        "activo" = (k."activo" OR dup."activo"),
        "esSemilla" = (k."esSemilla" OR dup."esSemilla")
    WHERE k."id" = keeper_id;

    -- 4. Se elimina el duplicado (ya no tiene nada colgado) y se deja constancia.
    DELETE FROM "Transportista" WHERE "id" = dup."id";

    INSERT INTO "Log" ("id", "usuarioId", "accion", "data", "createdAt")
    VALUES (
      gen_random_uuid()::text,
      NULL,
      'UNIFICAR_TRANSPORTISTAS',
      jsonb_build_object(
        'transportistaQueSeQuedaId', keeper_id,
        'transportistaEliminadoId', dup."id",
        'transportistaEliminadoNombre', dup."nombreORazonSocial",
        'lotesMovidos', n_lotes,
        'vehiculosMovidos', n_vehiculos,
        'liquidacionesMovidas', n_liquidaciones,
        'tarifasMovidas', n_tarifas
      ),
      CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'Unificar ROGER QUISPE: % -> %: % lote(s), % volqueta(s), % liquidación(es), % tarifa(s).',
      dup."id", keeper_id, n_lotes, n_vehiculos, n_liquidaciones, n_tarifas;
  END LOOP;
END
$$;
