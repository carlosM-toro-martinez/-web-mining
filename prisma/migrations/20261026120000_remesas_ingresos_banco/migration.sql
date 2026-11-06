-- Remesas que llegan por el banco.
--
-- 1. Una remesa (PresupuestoCaja) puede llegar en varias partes: el vínculo pasa del presupuesto
--    (asignadoMovimientoBancoId, uno a uno) al ingreso (MovimientoBancoCaja.presupuestoId, varios a uno).
-- 2. Un movimiento del banco registrado por error (p. ej. duplicado) se puede anular.
-- 3. El ingreso vinculado a una remesa es dinero de esa caja: genera un fondo de la caja
--    (MovimientoFondoCaja.movimientoBancoId), que es lo que leen el Excel, la rendición y el saldo.

-- AlterTable
ALTER TABLE "MovimientoBancoCaja" ADD COLUMN     "anulado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "anuladoEn" TIMESTAMP(3),
ADD COLUMN     "anuladoPorId" INTEGER,
ADD COLUMN     "motivoAnulacion" TEXT,
ADD COLUMN     "presupuestoId" INTEGER;

-- AlterTable
ALTER TABLE "MovimientoFondoCaja" ADD COLUMN     "movimientoBancoId" TEXT;

-- Se conserva cada vínculo ingreso -> remesa que ya existía.
UPDATE "MovimientoBancoCaja" b
SET "presupuestoId" = p."id"
FROM "PresupuestoCaja" p
WHERE p."asignadoMovimientoBancoId" = b."id";

-- DropForeignKey
ALTER TABLE "PresupuestoCaja" DROP CONSTRAINT "PresupuestoCaja_asignadoMovimientoBancoId_fkey";

-- DropIndex
DROP INDEX "PresupuestoCaja_asignadoMovimientoBancoId_key";

-- AlterTable
ALTER TABLE "PresupuestoCaja" DROP COLUMN "asignadoEn",
DROP COLUMN "asignadoMovimientoBancoId";

-- CreateIndex
CREATE INDEX "MovimientoBancoCaja_presupuestoId_idx" ON "MovimientoBancoCaja"("presupuestoId");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoFondoCaja_movimientoBancoId_key" ON "MovimientoFondoCaja"("movimientoBancoId");

-- AddForeignKey
ALTER TABLE "MovimientoFondoCaja" ADD CONSTRAINT "MovimientoFondoCaja_movimientoBancoId_fkey" FOREIGN KEY ("movimientoBancoId") REFERENCES "MovimientoBancoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoBancoCaja" ADD CONSTRAINT "MovimientoBancoCaja_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "PresupuestoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Los ingresos ya vinculados pasan a la caja de su remesa, con la misma regla que usa el sistema
-- desde ahora: no se toca lo anterior al último cuadre de esa caja (ese saldo ya se fijó con el
-- arqueo) ni un período con rendición cerrada, y la moneda debe ser la de la caja.
INSERT INTO "MovimientoFondoCaja" ("id", "cajaId", "tipo", "monto", "moneda", "fecha", "referencia", "usuarioId", "createdAt", "movimientoBancoId")
SELECT gen_random_uuid()::text, p."cajaId", 'REMESA_PRESUPUESTO'::"TipoMovimientoFondoCaja", b."monto", b."moneda", b."fecha",
       CASE b."formaPago"
         WHEN 'CHEQUE' THEN 'CH- ' || COALESCE(b."numeroCheque", '')
         WHEN 'TRANSFERENCIA' THEN 'TRANSFERENCIA'
         ELSE 'DEPÓSITO'
       END,
       b."usuarioId", CURRENT_TIMESTAMP, b."id"
FROM "MovimientoBancoCaja" b
JOIN "PresupuestoCaja" p ON p."id" = b."presupuestoId"
JOIN "CajaChica" c ON c."id" = p."cajaId"
WHERE b."tipo" = 'INGRESO'
  AND b."anulado" = false
  AND b."moneda" = c."monedaBase"
  AND NOT EXISTS (
    SELECT 1 FROM "CuadreSaldoCaja" q WHERE q."cajaId" = p."cajaId" AND b."fecha" < q."fechaCorte"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "RendicionCaja" r
    WHERE r."cajaId" = p."cajaId" AND r."estado" = 'CERRADO' AND b."fecha" BETWEEN r."periodoDesde" AND r."periodoHasta"
  );
