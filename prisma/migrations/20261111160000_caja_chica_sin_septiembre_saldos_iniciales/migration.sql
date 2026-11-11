-- Caja Chica arranca en octubre de 2026: se elimina todo lo anterior a octubre y los saldos iniciales
-- pasan a ser los del arqueo del 1/10/2026:
--   caja  = 156.305,35
--   banco =  73.912,10
-- (antes se llegaba a esos números con los movimientos de septiembre y un ajuste por cuadre).
--
-- Se elimina de lo anterior al 1/10/2026: gastos (con sus anulaciones), fondos de la caja, ingresos y salidas
-- del banco, presupuestos con sus partidas, rendiciones, y los dos cuadres del 1/10 con sus ajustes.
-- Octubre en adelante no se toca, salvo desvincular de las partidas de septiembre lo que apuntara a ellas.

DO $$
DECLARE
  caja_id int;
  cuenta_id int;
BEGIN
  -- La caja y la cuenta se toman de los cuadres del 1/10 (antes de borrarlos); si no estuvieran, por su nombre.
  SELECT "cajaId" INTO caja_id FROM "CuadreSaldoCaja" WHERE "fechaCorte" = '2026-10-01' AND "cajaId" IS NOT NULL LIMIT 1;
  SELECT "cuentaBancariaId" INTO cuenta_id FROM "CuadreSaldoCaja" WHERE "fechaCorte" = '2026-10-01' AND "cuentaBancariaId" IS NOT NULL LIMIT 1;
  IF caja_id IS NULL THEN
    SELECT "id" INTO caja_id FROM "CajaChica" WHERE "nombre" ILIKE 'Caja Bolivianos Lipe%' ORDER BY "id" LIMIT 1;
  END IF;
  IF cuenta_id IS NULL THEN
    SELECT "id" INTO cuenta_id FROM "CuentaBancariaCaja" WHERE "banco" = 'FIE' ORDER BY "id" LIMIT 1;
  END IF;

  -- Cuadres del 1/10 y los ajustes que generaron.
  CREATE TEMP TABLE _cuadres ON COMMIT DROP AS
    SELECT "id", "movimientoFondoId", "movimientoBancoId" FROM "CuadreSaldoCaja" WHERE "fechaCorte" = '2026-10-01';
  DELETE FROM "CuadreSaldoCaja" WHERE "id" IN (SELECT "id" FROM _cuadres);

  -- Gastos anteriores a octubre.
  CREATE TEMP TABLE _gastos ON COMMIT DROP AS SELECT "id" FROM "GastoCaja" WHERE "fecha" < '2026-10-01';
  DELETE FROM "RendicionDetalleGasto" WHERE "gastoId" IN (SELECT "id" FROM _gastos);
  DELETE FROM "AnulacionGastoCaja" WHERE "gastoId" IN (SELECT "id" FROM _gastos);
  DELETE FROM "GastoCaja" WHERE "id" IN (SELECT "id" FROM _gastos);

  -- Rendiciones anteriores a octubre.
  CREATE TEMP TABLE _rendiciones ON COMMIT DROP AS SELECT "id" FROM "RendicionCaja" WHERE "periodoDesde" < '2026-10-01';
  DELETE FROM "RendicionDetalleGasto" WHERE "rendicionId" IN (SELECT "id" FROM _rendiciones);
  DELETE FROM "AnulacionRendicionCaja" WHERE "rendicionId" IN (SELECT "id" FROM _rendiciones);
  DELETE FROM "RendicionCaja" WHERE "id" IN (SELECT "id" FROM _rendiciones);

  -- Movimientos del banco anteriores a octubre (y el ajuste del cuadre); con los fondos de caja que hubieran generado.
  CREATE TEMP TABLE _banco ON COMMIT DROP AS
    SELECT "id" FROM "MovimientoBancoCaja"
    WHERE "fecha" < '2026-10-01' OR "id" IN (SELECT "movimientoBancoId" FROM _cuadres WHERE "movimientoBancoId" IS NOT NULL);
  DELETE FROM "MovimientoFondoCaja" WHERE "movimientoBancoId" IN (SELECT "id" FROM _banco);
  DELETE FROM "MovimientoBancoCaja" WHERE "id" IN (SELECT "id" FROM _banco);

  -- Fondos de la caja anteriores a octubre (y el ajuste del cuadre).
  DELETE FROM "MovimientoFondoCaja"
  WHERE "fecha" < '2026-10-01' OR "id" IN (SELECT "movimientoFondoId" FROM _cuadres WHERE "movimientoFondoId" IS NOT NULL);

  -- Presupuestos de meses anteriores a octubre de 2026, con sus partidas.
  CREATE TEMP TABLE _presupuestos ON COMMIT DROP AS
    SELECT "id" FROM "PresupuestoCaja" WHERE ("anio" * 12 + "mes") < (2026 * 12 + 10);
  UPDATE "GastoCaja" SET "partidaPresupuestoId" = NULL
    WHERE "partidaPresupuestoId" IN (SELECT "id" FROM "PartidaPresupuestoCaja" WHERE "presupuestoId" IN (SELECT "id" FROM _presupuestos));
  UPDATE "MovimientoBancoCaja" SET "presupuestoId" = NULL WHERE "presupuestoId" IN (SELECT "id" FROM _presupuestos);
  DELETE FROM "PartidaPresupuestoCaja" WHERE "presupuestoId" IN (SELECT "id" FROM _presupuestos);
  DELETE FROM "PresupuestoCaja" WHERE "id" IN (SELECT "id" FROM _presupuestos);

  -- Saldos iniciales: los del arqueo del 1/10/2026.
  UPDATE "CajaChica" SET "saldoInicial" = 156305.35 WHERE "id" = caja_id;
  UPDATE "CuentaBancariaCaja" SET "saldoInicial" = 73912.10 WHERE "id" = cuenta_id;

  IF caja_id IS NULL OR cuenta_id IS NULL THEN
    RAISE WARNING 'Caja Chica: no se encontró la caja (%) o la cuenta bancaria (%) para fijar el saldo inicial.', caja_id, cuenta_id;
  END IF;
END
$$;
