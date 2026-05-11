/*
  Warnings:

  - You are about to drop the `Elemento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Muestra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Resultado` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ubicacion` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('CHANNEL', 'CHIP', 'GRAB', 'CORE', 'SOIL', 'ROCK', 'OTHER');

-- DropForeignKey
ALTER TABLE "Muestra" DROP CONSTRAINT "Muestra_ubicacionId_fkey";

-- DropForeignKey
ALTER TABLE "Muestra" DROP CONSTRAINT "Muestra_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Resultado" DROP CONSTRAINT "Resultado_elementoId_fkey";

-- DropForeignKey
ALTER TABLE "Resultado" DROP CONSTRAINT "Resultado_muestraId_fkey";

-- DropTable
DROP TABLE "Elemento";

-- DropTable
DROP TABLE "Muestra";

-- DropTable
DROP TABLE "Resultado";

-- DropTable
DROP TABLE "Ubicacion";

-- CreateTable
CREATE TABLE "MiningArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "MiningArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiningLevel" (
    "id" TEXT NOT NULL,
    "miningAreaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "elevation" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "MiningLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiningLabor" (
    "id" TEXT NOT NULL,
    "miningLevelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "code" TEXT,
    "east" DOUBLE PRECISION,
    "north" DOUBLE PRECISION,
    "elevation" DOUBLE PRECISION,
    "reference" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "MiningLabor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SamplePoint" (
    "id" TEXT NOT NULL,
    "miningLaborId" TEXT NOT NULL,
    "code" TEXT,
    "east" DOUBLE PRECISION,
    "north" DOUBLE PRECISION,
    "elevation" DOUBLE PRECISION,
    "station" TEXT,
    "reference" TEXT,
    "geologist" TEXT,
    "sampledAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SamplePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "samplePointId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sampleNumber" INTEGER,
    "sampleType" "SampleType" NOT NULL,
    "sector" TEXT,
    "batch" TEXT,
    "laboratory1" TEXT,
    "laboratory2" TEXT,
    "laboratory3" TEXT,
    "weight" DOUBLE PRECISION,
    "collectedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "description" TEXT,
    "moisture" DOUBLE PRECISION,
    "observations" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Element" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "unit" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Element_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleResult" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "qualifier" TEXT,
    "method" TEXT,
    "detectionLimit" DOUBLE PRECISION,
    "upperLimit" DOUBLE PRECISION,
    "unit" TEXT,
    "laboratory" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SampleResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleQAQC" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "passed" BOOLEAN,
    "expectedValue" DOUBLE PRECISION,
    "obtainedValue" DOUBLE PRECISION,
    "deviationPercent" DOUBLE PRECISION,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "SampleQAQC_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MiningLevel_miningAreaId_idx" ON "MiningLevel"("miningAreaId");

-- CreateIndex
CREATE INDEX "MiningLabor_miningLevelId_idx" ON "MiningLabor"("miningLevelId");

-- CreateIndex
CREATE INDEX "MiningLabor_east_north_idx" ON "MiningLabor"("east", "north");

-- CreateIndex
CREATE INDEX "SamplePoint_miningLaborId_idx" ON "SamplePoint"("miningLaborId");

-- CreateIndex
CREATE INDEX "SamplePoint_east_north_idx" ON "SamplePoint"("east", "north");

-- CreateIndex
CREATE INDEX "Sample_samplePointId_idx" ON "Sample"("samplePointId");

-- CreateIndex
CREATE INDEX "Sample_code_idx" ON "Sample"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Element_name_key" ON "Element"("name");

-- CreateIndex
CREATE INDEX "SampleResult_sampleId_idx" ON "SampleResult"("sampleId");

-- CreateIndex
CREATE INDEX "SampleResult_elementId_idx" ON "SampleResult"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "SampleResult_sampleId_elementId_key" ON "SampleResult"("sampleId", "elementId");

-- CreateIndex
CREATE INDEX "SampleQAQC_sampleId_idx" ON "SampleQAQC"("sampleId");

-- AddForeignKey
ALTER TABLE "MiningLevel" ADD CONSTRAINT "MiningLevel_miningAreaId_fkey" FOREIGN KEY ("miningAreaId") REFERENCES "MiningArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiningLabor" ADD CONSTRAINT "MiningLabor_miningLevelId_fkey" FOREIGN KEY ("miningLevelId") REFERENCES "MiningLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SamplePoint" ADD CONSTRAINT "SamplePoint_miningLaborId_fkey" FOREIGN KEY ("miningLaborId") REFERENCES "MiningLabor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_samplePointId_fkey" FOREIGN KEY ("samplePointId") REFERENCES "SamplePoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleResult" ADD CONSTRAINT "SampleResult_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleResult" ADD CONSTRAINT "SampleResult_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleQAQC" ADD CONSTRAINT "SampleQAQC_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
