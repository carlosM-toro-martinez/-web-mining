-- CreateEnum
CREATE TYPE "TipoEntidadRemitente" AS ENUM ('EMPRESA', 'TRABAJADOR_PARTICULAR');

-- CreateEnum
CREATE TYPE "TipoConceptoLiquidacion" AS ENUM ('ABONO', 'DEDUCCION');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ASISTENTE_ADMINISTRATIVO';

-- CreateTable
CREATE TABLE "MunicipioOrigen" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MunicipioOrigen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoMineral" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoMineral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingenio" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ingenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlicuotaRegalia" (
    "id" SERIAL NOT NULL,
    "municipioOrigenId" INTEGER NOT NULL,
    "tipoMineralId" INTEGER NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),

    CONSTRAINT "AlicuotaRegalia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifaLiquidacion" (
    "id" SERIAL NOT NULL,
    "tipoEntidad" "TipoEntidadRemitente" NOT NULL,
    "tipoMineralId" INTEGER,
    "precioPorTonelada" DECIMAL(14,6) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),

    CONSTRAINT "TarifaLiquidacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptoLiquidacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoConceptoLiquidacion" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConceptoLiquidacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MunicipioOrigen_codigo_key" ON "MunicipioOrigen"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TipoMineral_codigo_key" ON "TipoMineral"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Ingenio_codigo_key" ON "Ingenio"("codigo");

-- CreateIndex
CREATE INDEX "AlicuotaRegalia_municipioOrigenId_tipoMineralId_idx" ON "AlicuotaRegalia"("municipioOrigenId", "tipoMineralId");

-- CreateIndex
CREATE INDEX "TarifaLiquidacion_tipoEntidad_tipoMineralId_idx" ON "TarifaLiquidacion"("tipoEntidad", "tipoMineralId");

-- AddForeignKey
ALTER TABLE "AlicuotaRegalia" ADD CONSTRAINT "AlicuotaRegalia_municipioOrigenId_fkey" FOREIGN KEY ("municipioOrigenId") REFERENCES "MunicipioOrigen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlicuotaRegalia" ADD CONSTRAINT "AlicuotaRegalia_tipoMineralId_fkey" FOREIGN KEY ("tipoMineralId") REFERENCES "TipoMineral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarifaLiquidacion" ADD CONSTRAINT "TarifaLiquidacion_tipoMineralId_fkey" FOREIGN KEY ("tipoMineralId") REFERENCES "TipoMineral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
