-- Reconciliación de datos (sin cambios de esquema): el estado de cada volqueta debe coincidir con su viaje.
--
-- Origen: al editar un lote se podía cambiar su volqueta, pero el tablero de flota no se ajustaba. La volqueta
-- original quedaba "En tránsito" sin ningún lote que gestionar (y la pantalla decía "No se encontró un lote
-- activo para este vehículo"), y la volqueta nueva quedaba "Disponible" o "En retorno" aunque llevaba el viaje.
-- Ya se corrigió el origen (al cambiar la volqueta de un viaje en curso se ajustan las dos); esto repara lo que
-- ya había quedado mal.
--
-- Qué hace (la verdad es el lote):
--   1. Volqueta con un lote en curso (registrado / en tránsito / en balanza) cuyo estado no coincide: pasa al
--      estado de ese lote. No se toca si está en falla mecánica o en mantenimiento (eso lo decide una persona).
--   2. Volqueta "En tránsito" o "En balanza" sin ningún lote en curso: pasa a Disponible.
-- Cada cambio queda en el historial de estados de la flota. Es idempotente: si ya está todo bien, no hace nada.

DO $$
DECLARE
  usuario_sistema int;
BEGIN
  -- El historial exige un usuario: se usa el primer administrador (o, si no hay, el primer usuario).
  SELECT "id" INTO usuario_sistema FROM "User" WHERE "role" = 'ADMIN' ORDER BY "id" LIMIT 1;
  IF usuario_sistema IS NULL THEN
    SELECT "id" INTO usuario_sistema FROM "User" ORDER BY "id" LIMIT 1;
  END IF;
  IF usuario_sistema IS NULL THEN
    RAISE NOTICE 'Reconciliar volquetas: no hay usuarios, no se hace nada.';
    RETURN;
  END IF;

  -- 1) Volquetas que llevan un viaje en curso pero figuran en otro estado.
  WITH viaje AS (
    SELECT DISTINCT ON (l."vehiculoId")
           l."vehiculoId" AS vid,
           l."correlativo" AS correlativo,
           CASE WHEN l."estadoLote" = 'EN_BALANZA' THEN 'EN_BALANZA' ELSE 'EN_TRANSITO' END AS estado
    FROM "LoteDespacho" l
    WHERE l."estadoLote" IN ('REGISTRADO', 'EN_TRANSITO', 'EN_BALANZA')
    ORDER BY l."vehiculoId", l."createdAt" DESC
  ),
  cambiadas AS (
    UPDATE "Vehiculo" v
    SET "estadoActual" = viaje.estado::"EstadoVehiculo"
    FROM viaje
    WHERE v."id" = viaje.vid
      AND v."estadoActual"::text <> viaje.estado
      AND v."estadoActual"::text IN ('DISPONIBLE', 'EN_RETORNO', 'EN_TRANSITO', 'EN_BALANZA')
    RETURNING v."id" AS vid, viaje.estado AS estado, viaje.correlativo AS correlativo
  )
  INSERT INTO "EstadoFlotaHistorico" ("id", "vehiculoId", "estado", "motivo", "origenCambio", "usuarioId", "createdAt")
  SELECT gen_random_uuid()::text, vid, estado::"EstadoVehiculo",
         'Corrección automática: lleva el lote ' || correlativo,
         'MANUAL'::"OrigenCambioFlota", usuario_sistema, CURRENT_TIMESTAMP
  FROM cambiadas;

  -- 2) Volquetas que figuran en tránsito o en balanza sin ningún viaje en curso.
  WITH liberadas AS (
    UPDATE "Vehiculo" v
    SET "estadoActual" = 'DISPONIBLE'
    WHERE v."estadoActual"::text IN ('EN_TRANSITO', 'EN_BALANZA')
      AND NOT EXISTS (
        SELECT 1 FROM "LoteDespacho" l
        WHERE l."vehiculoId" = v."id" AND l."estadoLote" IN ('REGISTRADO', 'EN_TRANSITO', 'EN_BALANZA')
      )
    RETURNING v."id" AS vid
  )
  INSERT INTO "EstadoFlotaHistorico" ("id", "vehiculoId", "estado", "motivo", "origenCambio", "usuarioId", "createdAt")
  SELECT gen_random_uuid()::text, vid, 'DISPONIBLE'::"EstadoVehiculo",
         'Corrección automática: no tenía ningún lote en curso',
         'MANUAL'::"OrigenCambioFlota", usuario_sistema, CURRENT_TIMESTAMP
  FROM liberadas;
END
$$;
