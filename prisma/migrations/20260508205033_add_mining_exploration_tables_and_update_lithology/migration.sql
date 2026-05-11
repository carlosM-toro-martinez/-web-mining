/*
  Warnings:

  - You are about to drop the column `alteration` on the `Lithology` table. All the data in the column will be lost.
  - You are about to drop the column `mineralization` on the `Lithology` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lithology" DROP COLUMN "alteration",
DROP COLUMN "mineralization",
ADD COLUMN     "code" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "grainSize" TEXT,
ADD COLUMN     "texture" TEXT,
ADD COLUMN     "weathering" TEXT;

-- CreateTable
CREATE TABLE "DrillHoleSurvey" (
    "id" SERIAL NOT NULL,
    "drillHoleId" INTEGER NOT NULL,
    "depth" DECIMAL(12,4) NOT NULL,
    "azimuth" DECIMAL(9,4) NOT NULL,
    "dip" DECIMAL(9,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillHoleSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssayValue" (
    "id" SERIAL NOT NULL,
    "assayId" INTEGER NOT NULL,
    "element" TEXT NOT NULL,
    "value" DECIMAL(18,6) NOT NULL,
    "unit" TEXT,
    "detectionLimit" DECIMAL(18,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "AssayValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alteration" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "intensity" DECIMAL(5,2),
    "description" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Alteration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mineralization" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "mineral" TEXT NOT NULL,
    "percentage" DECIMAL(5,2),
    "style" TEXT,
    "habit" TEXT,
    "description" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Mineralization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeologicalStructure" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "structureType" TEXT NOT NULL,
    "angle" DECIMAL(9,4),
    "width" DECIMAL(12,4),
    "orientation" TEXT,
    "description" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "GeologicalStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recovery" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "recoveryPercent" DECIMAL(5,2),
    "rqdPercent" DECIMAL(5,2),
    "coreLoss" DECIMAL(12,4),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Recovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Density" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "specificGravity" DECIMAL(8,4) NOT NULL,
    "method" TEXT,
    "dryDensity" DECIMAL(8,4),
    "wetDensity" DECIMAL(8,4),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Density_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagneticSusceptibility" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "value" DECIMAL(18,6) NOT NULL,
    "unit" TEXT,
    "instrument" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "MagneticSusceptibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrillHoleSurvey_drillHoleId_idx" ON "DrillHoleSurvey"("drillHoleId");

-- CreateIndex
CREATE INDEX "AssayValue_assayId_idx" ON "AssayValue"("assayId");

-- CreateIndex
CREATE INDEX "AssayValue_element_idx" ON "AssayValue"("element");

-- CreateIndex
CREATE INDEX "Alteration_intervalId_idx" ON "Alteration"("intervalId");

-- CreateIndex
CREATE INDEX "Mineralization_intervalId_idx" ON "Mineralization"("intervalId");

-- CreateIndex
CREATE INDEX "GeologicalStructure_intervalId_idx" ON "GeologicalStructure"("intervalId");

-- CreateIndex
CREATE INDEX "Recovery_intervalId_idx" ON "Recovery"("intervalId");

-- CreateIndex
CREATE INDEX "Density_intervalId_idx" ON "Density"("intervalId");

-- CreateIndex
CREATE INDEX "MagneticSusceptibility_intervalId_idx" ON "MagneticSusceptibility"("intervalId");

-- AddForeignKey
ALTER TABLE "DrillHoleSurvey" ADD CONSTRAINT "DrillHoleSurvey_drillHoleId_fkey" FOREIGN KEY ("drillHoleId") REFERENCES "DrillHole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssayValue" ADD CONSTRAINT "AssayValue_assayId_fkey" FOREIGN KEY ("assayId") REFERENCES "Assay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alteration" ADD CONSTRAINT "Alteration_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mineralization" ADD CONSTRAINT "Mineralization_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeologicalStructure" ADD CONSTRAINT "GeologicalStructure_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recovery" ADD CONSTRAINT "Recovery_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Density" ADD CONSTRAINT "Density_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagneticSusceptibility" ADD CONSTRAINT "MagneticSusceptibility_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
