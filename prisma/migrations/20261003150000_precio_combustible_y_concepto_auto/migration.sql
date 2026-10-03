-- DropForeignKey
ALTER TABLE "TarifaLiquidacion" DROP CONSTRAINT "TarifaLiquidacion_transportistaId_fkey";

-- AlterTable
ALTER TABLE "ConceptoLiquidacion" ADD COLUMN     "esCombustible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PrecioCombustible" (
    "id" SERIAL NOT NULL,
    "precioPorLitro" DECIMAL(14,6) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteHasta" TIMESTAMP(3),

    CONSTRAINT "PrecioCombustible_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrecioCombustible_vigenteDesde_idx" ON "PrecioCombustible"("vigenteDesde");

-- AddForeignKey
ALTER TABLE "TarifaLiquidacion" ADD CONSTRAINT "TarifaLiquidacion_transportistaId_fkey" FOREIGN KEY ("transportistaId") REFERENCES "Transportista"("id") ON DELETE SET NULL ON UPDATE CASCADE;
