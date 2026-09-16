-- Formulario 101 pasa de ser dos columnas sueltas en LoteDespacho a su
-- propia entidad, para poder reutilizarlo (desvincular de un lote y
-- vincularlo a otro distinto) y para poder anularlo con su propia
-- Petición de Anulación. También se agregan los campos que faltaban en
-- el Conocimiento (fecha propia, detalle de carga, descripción,
-- observaciones), una nota en el pesaje, y el registro de transbordo
-- (cambio de vehículo/chofer a mitad de camino por falla mecánica).

-- CreateEnum (con nombre temporal para no chocar con el tipo viejo, que
-- todavía está en uso por la columna que se elimina más abajo)
CREATE TYPE "EstadoFormulario101_new" AS ENUM ('DISPONIBLE', 'VINCULADO', 'ANULADO');

-- CreateTable
CREATE TABLE "Formulario101" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoFormulario101_new" NOT NULL DEFAULT 'VINCULADO',
    "loteId" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Formulario101_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnulacionFormulario101" (
    "id" TEXT NOT NULL,
    "formulario101Id" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "peticionEnviada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnulacionFormulario101_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransbordoLote" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "vehiculoOriginalId" INTEGER NOT NULL,
    "vehiculoNuevoId" INTEGER NOT NULL,
    "choferNuevoId" INTEGER,
    "motivo" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransbordoLote_pkey" PRIMARY KEY ("id")
);

-- AlterTable: nuevos campos del Conocimiento (fecha se rellena abajo y
-- luego se vuelve obligatoria)
ALTER TABLE "ConocimientoCarga"
    ADD COLUMN "fecha" TIMESTAMP(3),
    ADD COLUMN "detalleCarga" TEXT NOT NULL DEFAULT 'Carga Chami',
    ADD COLUMN "descripcion" TEXT,
    ADD COLUMN "observaciones" TEXT;

UPDATE "ConocimientoCarga" cc
SET "fecha" = ld."fechaDocumentalFiscal"
FROM "LoteDespacho" ld
WHERE ld.id = cc."loteId";

ALTER TABLE "ConocimientoCarga" ALTER COLUMN "fecha" SET NOT NULL;

-- AlterTable
ALTER TABLE "PesajeIngenio" ADD COLUMN "observaciones" TEXT;

-- Backfill: cada lote que ya tenía un Formulario 101 regularizado pasa a
-- ser una fila propia en la tabla nueva, vinculada a ese mismo lote.
INSERT INTO "Formulario101" ("id", "codigo", "fecha", "estado", "loteId", "usuarioId", "createdAt")
SELECT gen_random_uuid(), ld."codigoFormulario101", ld."fechaDocumentalFiscal", 'VINCULADO'::"EstadoFormulario101_new", ld."id", ld."usuarioRegistroId", CURRENT_TIMESTAMP
FROM "LoteDespacho" ld
WHERE ld."codigoFormulario101" IS NOT NULL AND ld."estadoFormulario101" = 'REGULARIZADO';

-- DropColumn (libera el enum viejo para poder reemplazarlo)
ALTER TABLE "LoteDespacho" DROP COLUMN "codigoFormulario101";
ALTER TABLE "LoteDespacho" DROP COLUMN "estadoFormulario101";

DROP TYPE "EstadoFormulario101";
ALTER TYPE "EstadoFormulario101_new" RENAME TO "EstadoFormulario101";

-- CreateIndex
CREATE UNIQUE INDEX "Formulario101_codigo_key" ON "Formulario101"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Formulario101_loteId_key" ON "Formulario101"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "AnulacionFormulario101_formulario101Id_key" ON "AnulacionFormulario101"("formulario101Id");

-- CreateIndex
CREATE INDEX "TransbordoLote_loteId_idx" ON "TransbordoLote"("loteId");

-- AddForeignKey
ALTER TABLE "Formulario101" ADD CONSTRAINT "Formulario101_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteDespacho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formulario101" ADD CONSTRAINT "Formulario101_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionFormulario101" ADD CONSTRAINT "AnulacionFormulario101_formulario101Id_fkey" FOREIGN KEY ("formulario101Id") REFERENCES "Formulario101"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionFormulario101" ADD CONSTRAINT "AnulacionFormulario101_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransbordoLote" ADD CONSTRAINT "TransbordoLote_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteDespacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransbordoLote" ADD CONSTRAINT "TransbordoLote_vehiculoOriginalId_fkey" FOREIGN KEY ("vehiculoOriginalId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransbordoLote" ADD CONSTRAINT "TransbordoLote_vehiculoNuevoId_fkey" FOREIGN KEY ("vehiculoNuevoId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransbordoLote" ADD CONSTRAINT "TransbordoLote_choferNuevoId_fkey" FOREIGN KEY ("choferNuevoId") REFERENCES "Chofer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransbordoLote" ADD CONSTRAINT "TransbordoLote_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
