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

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" INTEGER NOT NULL,

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

    CONSTRAINT "DrillHole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interval" (
    "id" SERIAL NOT NULL,
    "drillHoleId" INTEGER NOT NULL,
    "fromDepth" DECIMAL(12,4) NOT NULL,
    "toDepth" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

    CONSTRAINT "Assay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lithology" (
    "id" SERIAL NOT NULL,
    "intervalId" INTEGER NOT NULL,
    "rockType" TEXT,
    "alteration" TEXT,
    "mineralization" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
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
