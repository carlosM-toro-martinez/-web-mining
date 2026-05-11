-- DropForeignKey
ALTER TABLE "Alteration" DROP CONSTRAINT "Alteration_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "AssayValue" DROP CONSTRAINT "AssayValue_assayId_fkey";

-- DropForeignKey
ALTER TABLE "Density" DROP CONSTRAINT "Density_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "DrillHoleSurvey" DROP CONSTRAINT "DrillHoleSurvey_drillHoleId_fkey";

-- DropForeignKey
ALTER TABLE "GeologicalStructure" DROP CONSTRAINT "GeologicalStructure_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "MagneticSusceptibility" DROP CONSTRAINT "MagneticSusceptibility_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "Mineralization" DROP CONSTRAINT "Mineralization_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "Recovery" DROP CONSTRAINT "Recovery_intervalId_fkey";

-- AlterTable
ALTER TABLE "Alteration" ALTER COLUMN "intervalId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AssayValue" ALTER COLUMN "assayId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Density" ALTER COLUMN "intervalId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DrillHoleSurvey" ALTER COLUMN "drillHoleId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GeologicalStructure" ALTER COLUMN "intervalId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MagneticSusceptibility" ALTER COLUMN "intervalId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Mineralization" ALTER COLUMN "intervalId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Recovery" ALTER COLUMN "intervalId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "DrillHoleSurvey" ADD CONSTRAINT "DrillHoleSurvey_drillHoleId_fkey" FOREIGN KEY ("drillHoleId") REFERENCES "DrillHole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssayValue" ADD CONSTRAINT "AssayValue_assayId_fkey" FOREIGN KEY ("assayId") REFERENCES "Assay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alteration" ADD CONSTRAINT "Alteration_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mineralization" ADD CONSTRAINT "Mineralization_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeologicalStructure" ADD CONSTRAINT "GeologicalStructure_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recovery" ADD CONSTRAINT "Recovery_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Density" ADD CONSTRAINT "Density_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagneticSusceptibility" ADD CONSTRAINT "MagneticSusceptibility_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE SET NULL ON UPDATE CASCADE;
