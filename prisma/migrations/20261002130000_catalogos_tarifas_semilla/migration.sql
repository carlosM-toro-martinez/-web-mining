-- AlterTable
ALTER TABLE "MunicipioOrigen" ADD COLUMN     "esSemilla" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TipoMineral" ADD COLUMN     "esSemilla" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ingenio" ADD COLUMN     "esSemilla" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TarifaLiquidacion" ADD COLUMN     "esSemilla" BOOLEAN NOT NULL DEFAULT false;
