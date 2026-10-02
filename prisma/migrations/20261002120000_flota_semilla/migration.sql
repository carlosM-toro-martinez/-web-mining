-- AlterTable
ALTER TABLE "Transportista" ADD COLUMN     "esSemilla" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Vehiculo" ADD COLUMN     "esSemilla" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Chofer" ADD COLUMN     "esSemilla" BOOLEAN NOT NULL DEFAULT false;
