-- CreateEnum
CREATE TYPE "DrillHoleType" AS ENUM ('DDH', 'RC', 'AC', 'OTHER');

-- CreateEnum
CREATE TYPE "AssayMethod" AS ENUM ('AAS', 'ICP', 'XRF', 'OTHER');

-- CreateEnum
CREATE TYPE "QAQCType" AS ENUM ('BLANK', 'DUPLICATE', 'STANDARD');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('OPEN_PIT', 'UNDERGROUND');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('MEASURED', 'INDICATED', 'INFERRED');

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillHole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "east" DECIMAL(12,4) NOT NULL,
    "north" DECIMAL(12,4) NOT NULL,
    "elevation" DECIMAL(12,4),
    "depth" DECIMAL(12,4) NOT NULL,
    "azimuth" DECIMAL(9,4),
    "dip" DECIMAL(9,4),
    "type" "DrillHoleType" NOT NULL,
    "campaign" TEXT,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "DrillHole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interval" (
    "id" SERIAL NOT NULL,
    "drillHoleId" INTEGER NOT NULL,
    "fromDepth" DECIMAL(12,4) NOT NULL,
    "toDepth" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Interval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assay" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "au" DECIMAL(12,4) NOT NULL,
    "cu" DECIMAL(12,4) NOT NULL,
    "ag" DECIMAL(12,4) NOT NULL,
    "assayMethod" "AssayMethod" NOT NULL,
    "laboratory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Assay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lithology" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "rockType" TEXT,
    "code" TEXT,
    "color" TEXT,
    "grainSize" TEXT,
    "texture" TEXT,
    "weathering" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Lithology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QAQC" (
    "id" SERIAL NOT NULL,
    "assayId" INTEGER NOT NULL,
    "type" "QAQCType" NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "QAQC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "type" "ResourceType" NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "cutoff" DECIMAL(12,4) NOT NULL,
    "tonnes" DECIMAL(18,2) NOT NULL,
    "au" DECIMAL(12,4) NOT NULL,
    "cu" DECIMAL(12,4) NOT NULL,
    "ag" DECIMAL(12,4) NOT NULL,
    "cuEq" DECIMAL(12,4) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "Zone_projectId_idx" ON "Zone"("projectId");

-- CreateIndex
CREATE INDEX "DrillHole_east_north_idx" ON "DrillHole"("east", "north");

-- CreateIndex
CREATE INDEX "DrillHole_projectId_idx" ON "DrillHole"("projectId");

-- CreateIndex
CREATE INDEX "DrillHole_zoneId_idx" ON "DrillHole"("zoneId");

-- CreateIndex
CREATE INDEX "Interval_drillHoleId_idx" ON "Interval"("drillHoleId");

-- CreateIndex
CREATE INDEX "Assay_intervalId_idx" ON "Assay"("intervalId");

-- CreateIndex
CREATE INDEX "Lithology_intervalId_idx" ON "Lithology"("intervalId");

-- CreateIndex
CREATE INDEX "QAQC_assayId_idx" ON "QAQC"("assayId");

-- CreateIndex
CREATE INDEX "Resource_projectId_idx" ON "Resource"("projectId");

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
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillHole" ADD CONSTRAINT "DrillHole_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillHole" ADD CONSTRAINT "DrillHole_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interval" ADD CONSTRAINT "Interval_drillHoleId_fkey" FOREIGN KEY ("drillHoleId") REFERENCES "DrillHole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assay" ADD CONSTRAINT "Assay_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lithology" ADD CONSTRAINT "Lithology_intervalId_fkey" FOREIGN KEY ("intervalId") REFERENCES "Interval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAQC" ADD CONSTRAINT "QAQC_assayId_fkey" FOREIGN KEY ("assayId") REFERENCES "Assay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
