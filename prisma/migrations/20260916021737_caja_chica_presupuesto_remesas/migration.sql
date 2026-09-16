-- Agrupa las partidas de presupuesto bajo "remesas" (PresupuestoCaja):
-- varias remesas por mes (ej. "Remesa Presupuesto Octubre", "Remesa para
-- pago de salarios"), cada una con sus propias partidas y su propia
-- asignación (única) a un movimiento bancario.

-- CreateTable
CREATE TABLE "PresupuestoCaja" (
    "id" SERIAL NOT NULL,
    "cajaId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asignadoMovimientoBancoId" TEXT,
    "asignadoEn" TIMESTAMP(3),

    CONSTRAINT "PresupuestoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoCaja_asignadoMovimientoBancoId_key" ON "PresupuestoCaja"("asignadoMovimientoBancoId");

-- CreateIndex
CREATE INDEX "PresupuestoCaja_cajaId_anio_mes_idx" ON "PresupuestoCaja"("cajaId", "anio", "mes");

-- AddForeignKey
ALTER TABLE "PresupuestoCaja" ADD CONSTRAINT "PresupuestoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaChica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoCaja" ADD CONSTRAINT "PresupuestoCaja_asignadoMovimientoBancoId_fkey" FOREIGN KEY ("asignadoMovimientoBancoId") REFERENCES "MovimientoBancoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: agrupa las partidas existentes (si las hay) en una remesa por
-- cada combinación caja/año/mes que ya tuviera partidas, para no perder
-- ningún dato real que ya estuviera cargado.
INSERT INTO "PresupuestoCaja" ("cajaId", "anio", "mes", "nombre", "activo", "createdAt")
SELECT DISTINCT "cajaId", "anio", "mes", 'Presupuesto migrado', true, CURRENT_TIMESTAMP
FROM "PartidaPresupuestoCaja";

-- AlterTable: agrega la columna nueva (todavía nullable) y la rellena
ALTER TABLE "PartidaPresupuestoCaja" ADD COLUMN "presupuestoId" INTEGER;

UPDATE "PartidaPresupuestoCaja" p
SET "presupuestoId" = pc."id"
FROM "PresupuestoCaja" pc
WHERE pc."cajaId" = p."cajaId" AND pc."anio" = p."anio" AND pc."mes" = p."mes";

-- Ahora que está rellena, la vuelve obligatoria
ALTER TABLE "PartidaPresupuestoCaja" ALTER COLUMN "presupuestoId" SET NOT NULL;

-- DropForeignKey / DropIndex de las columnas viejas
ALTER TABLE "PartidaPresupuestoCaja" DROP CONSTRAINT "PartidaPresupuestoCaja_cajaId_fkey";
DROP INDEX "PartidaPresupuestoCaja_cajaId_anio_mes_idx";

-- DropColumn
ALTER TABLE "PartidaPresupuestoCaja" DROP COLUMN "cajaId",
DROP COLUMN "anio",
DROP COLUMN "mes";

-- CreateIndex
CREATE INDEX "PartidaPresupuestoCaja_presupuestoId_idx" ON "PartidaPresupuestoCaja"("presupuestoId");

-- AddForeignKey
ALTER TABLE "PartidaPresupuestoCaja" ADD CONSTRAINT "PartidaPresupuestoCaja_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "PresupuestoCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
