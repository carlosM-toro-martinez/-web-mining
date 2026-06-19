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
ALTER TABLE "MiningLabor" DROP CONSTRAINT "MiningLabor_miningLevelId_fkey";

-- DropForeignKey
ALTER TABLE "MiningLevel" DROP CONSTRAINT "MiningLevel_miningAreaId_fkey";

-- DropForeignKey
ALTER TABLE "QAQC" DROP CONSTRAINT "QAQC_assayId_fkey";

-- DropForeignKey
ALTER TABLE "Recovery" DROP CONSTRAINT "Recovery_intervalId_fkey";

-- DropForeignKey
ALTER TABLE "Resource" DROP CONSTRAINT "Resource_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Sample" DROP CONSTRAINT "Sample_miningLaborId_fkey";

-- DropForeignKey
ALTER TABLE "SampleLaboratory" DROP CONSTRAINT "SampleLaboratory_laboratoryId_fkey";

-- DropForeignKey
ALTER TABLE "SampleLaboratory" DROP CONSTRAINT "SampleLaboratory_sampleId_fkey";

-- DropForeignKey
ALTER TABLE "SampleQAQC" DROP CONSTRAINT "SampleQAQC_sampleId_fkey";

-- DropForeignKey
ALTER TABLE "SampleResult" DROP CONSTRAINT "SampleResult_elementId_fkey";

-- DropForeignKey
ALTER TABLE "SampleResult" DROP CONSTRAINT "SampleResult_sampleId_fkey";

-- DropForeignKey
ALTER TABLE "SampleResult" DROP CONSTRAINT "SampleResult_sampleLaboratoryId_fkey";

-- DropForeignKey
ALTER TABLE "SignificantIntercept" DROP CONSTRAINT "SignificantIntercept_drillHoleId_fkey";

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
DROP TABLE "Element";

-- DropTable
DROP TABLE "GeologicalStructure";

-- DropTable
DROP TABLE "Interval";

-- DropTable
DROP TABLE "Laboratory";

-- DropTable
DROP TABLE "Lithology";

-- DropTable
DROP TABLE "MagneticSusceptibility";

-- DropTable
DROP TABLE "Mineralization";

-- DropTable
DROP TABLE "MiningArea";

-- DropTable
DROP TABLE "MiningLabor";

-- DropTable
DROP TABLE "MiningLevel";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "QAQC";

-- DropTable
DROP TABLE "Recovery";

-- DropTable
DROP TABLE "Resource";

-- DropTable
DROP TABLE "Sample";

-- DropTable
DROP TABLE "SampleLaboratory";

-- DropTable
DROP TABLE "SampleQAQC";

-- DropTable
DROP TABLE "SampleResult";

-- DropTable
DROP TABLE "SignificantIntercept";

-- DropTable
DROP TABLE "Zone";

-- DropEnum
DROP TYPE "AssayMethod";

-- DropEnum
DROP TYPE "DrillHoleType";

-- DropEnum
DROP TYPE "LaboratorySlot";

-- DropEnum
DROP TYPE "QAQCType";

-- DropEnum
DROP TYPE "ResourceCategory";

-- DropEnum
DROP TYPE "ResourceType";

-- DropEnum
DROP TYPE "SampleType";
