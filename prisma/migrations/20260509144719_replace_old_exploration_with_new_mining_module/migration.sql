/*
  Warnings:

  - You are about to drop the `Alteration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Assay` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AssayValue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Density` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DrillHole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DrillHoleSurvey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GeologicalStructure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Interval` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lithology` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MagneticSusceptibility` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Mineralization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QAQC` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Recovery` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Resource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Zone` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Alteration" DROP CONSTRAINT "Alteration_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "Assay" DROP CONSTRAINT "Assay_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "AssayValue" DROP CONSTRAINT "AssayValue_assayId_fkey";

-- DropForeignKey
ALTER TABLE "Density" DROP CONSTRAINT "Density_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "DrillHole" DROP CONSTRAINT "DrillHole_projectId_fkey";

-- DropForeignKey
ALTER TABLE "DrillHole" DROP CONSTRAINT "DrillHole_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "DrillHoleSurvey" DROP CONSTRAINT "DrillHoleSurvey_drillHoleId_fkey";

-- DropForeignKey
ALTER TABLE "GeologicalStructure" DROP CONSTRAINT "GeologicalStructure_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "Interval" DROP CONSTRAINT "Interval_drillHoleId_fkey";

-- DropForeignKey
ALTER TABLE "Lithology" DROP CONSTRAINT "Lithology_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "MagneticSusceptibility" DROP CONSTRAINT "MagneticSusceptibility_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "Mineralization" DROP CONSTRAINT "Mineralization_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "QAQC" DROP CONSTRAINT "QAQC_assayId_fkey";

-- DropForeignKey
ALTER TABLE "Recovery" DROP CONSTRAINT "Recovery_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "Resource" DROP CONSTRAINT "Resource_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_projectId_fkey";

-- DropTable
DROP TABLE "Alteration";

-- DropTable
DROP TABLE "Assay";

-- DropTable
DROP TABLE "AssayValue";

-- DropTable
DROP TABLE "Density";

-- DropTable
DROP TABLE "DrillHole";

-- DropTable
DROP TABLE "DrillHoleSurvey";

-- DropTable
DROP TABLE "GeologicalStructure";

-- DropTable
DROP TABLE "Interval";

-- DropTable
DROP TABLE "Lithology";

-- DropTable
DROP TABLE "MagneticSusceptibility";

-- DropTable
DROP TABLE "Mineralization";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "QAQC";

-- DropTable
DROP TABLE "Recovery";

-- DropTable
DROP TABLE "Resource";

-- DropTable
DROP TABLE "Zone";

-- DropEnum
DROP TYPE "AssayMethod";

-- DropEnum
DROP TYPE "DrillHoleType";

-- DropEnum
DROP TYPE "QAQCType";

-- DropEnum
DROP TYPE "ResourceCategory";

-- DropEnum
DROP TYPE "ResourceType";
