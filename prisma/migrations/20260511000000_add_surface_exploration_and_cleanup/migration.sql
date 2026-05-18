-- ============================================================
-- Migration: add_surface_exploration_and_cleanup
-- Adds Laboratory, SampleLaboratory, SignificantIntercept tables
-- Updates Sample, SampleResult, Element, MiningLabor tables
-- Adds new Role/SampleType enum values
-- Drops SamplePoint (no longer used)
-- ============================================================

-- CreateEnum (compatible with older PostgreSQL versions)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LaboratorySlot') THEN
    CREATE TYPE "LaboratorySlot" AS ENUM ('L1', 'L2', 'L3');
  END IF;
END $$;

-- AlterEnum Role (add new roles)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VISITANTE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'VISITANTE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GEOLOGOADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'GEOLOGOADMIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GEOLOGO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'GEOLOGO';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMINISTRADOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'ADMINISTRADOR';
  END IF;
END $$;

-- AlterEnum SampleType (add new values; PostgreSQL cannot remove enum values)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SIMPLE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SampleType')) THEN
    ALTER TYPE "SampleType" ADD VALUE 'SIMPLE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DOUBLE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SampleType')) THEN
    ALTER TYPE "SampleType" ADD VALUE 'DOUBLE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SIMPLE_DOUBLE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SampleType')) THEN
    ALTER TYPE "SampleType" ADD VALUE 'SIMPLE_DOUBLE';
  END IF;
END $$;

-- ── CreateTable Laboratory ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Laboratory" (
    "id"           TEXT         NOT NULL,
    "name"         TEXT         NOT NULL,
    "abbreviation" TEXT,
    "description"  TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById"  INTEGER,
    "updatedById"  INTEGER,
    CONSTRAINT "Laboratory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Laboratory_name_key" ON "Laboratory"("name");

-- ── CreateTable SampleLaboratory ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SampleLaboratory" (
    "id"           TEXT              NOT NULL,
    "sampleId"     TEXT              NOT NULL,
    "laboratoryId" TEXT              NOT NULL,
    "slot"         "LaboratorySlot"  NOT NULL,
    "createdAt"    TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById"  INTEGER,
    "updatedById"  INTEGER,
    CONSTRAINT "SampleLaboratory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SampleLaboratory_sampleId_slot_key"    ON "SampleLaboratory"("sampleId", "slot");
CREATE        INDEX IF NOT EXISTS "SampleLaboratory_sampleId_idx"          ON "SampleLaboratory"("sampleId");
CREATE        INDEX IF NOT EXISTS "SampleLaboratory_laboratoryId_idx"      ON "SampleLaboratory"("laboratoryId");

ALTER TABLE "SampleLaboratory"
    ADD CONSTRAINT "SampleLaboratory_sampleId_fkey"
    FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SampleLaboratory"
    ADD CONSTRAINT "SampleLaboratory_laboratoryId_fkey"
    FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── CreateTable SignificantIntercept ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SignificantIntercept" (
    "id"          SERIAL       NOT NULL,
    "drillHoleId" INTEGER      NOT NULL,
    "isIncluding" BOOLEAN      NOT NULL DEFAULT false,
    "fromDepth"   DECIMAL(12,4) NOT NULL,
    "toDepth"     DECIMAL(12,4) NOT NULL,
    "width"       DECIMAL(12,4) NOT NULL,
    "trueWidth"   DECIMAL(12,4),
    "au"          DECIMAL(12,4),
    "cu"          DECIMAL(12,4),
    "ag"          DECIMAL(12,4),
    "comments"    TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    CONSTRAINT "SignificantIntercept_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SignificantIntercept_drillHoleId_idx" ON "SignificantIntercept"("drillHoleId");

ALTER TABLE "SignificantIntercept"
    ADD CONSTRAINT "SignificantIntercept_drillHoleId_fkey"
    FOREIGN KEY ("drillHoleId") REFERENCES "DrillHole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── AlterTable Element ────────────────────────────────────────────────────────
-- Rename unit → defaultUnit (safe if column exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Element' AND column_name='unit') THEN
    ALTER TABLE "Element" RENAME COLUMN "unit" TO "defaultUnit";
  END IF;
END $$;
ALTER TABLE "Element" ADD COLUMN IF NOT EXISTS "defaultUnit" TEXT;

-- Make symbol NOT NULL (fill nulls with name as fallback)
UPDATE "Element" SET "symbol" = "name" WHERE "symbol" IS NULL OR "symbol" = '';
ALTER TABLE "Element" ALTER COLUMN "symbol" SET NOT NULL;

-- Drop old unique on name, add new indexes
DROP INDEX IF EXISTS "Element_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Element_symbol_defaultUnit_key" ON "Element"("symbol", "defaultUnit");
CREATE        INDEX IF NOT EXISTS "Element_symbol_idx"              ON "Element"("symbol");

-- ── AlterTable MiningLabor ────────────────────────────────────────────────────
DROP INDEX IF EXISTS "MiningLabor_east_north_idx";
ALTER TABLE "MiningLabor" DROP COLUMN IF EXISTS "east";
ALTER TABLE "MiningLabor" DROP COLUMN IF EXISTS "north";
ALTER TABLE "MiningLabor" DROP COLUMN IF EXISTS "elevation";
ALTER TABLE "MiningLabor" DROP COLUMN IF EXISTS "reference";

-- ── AlterTable Sample ─────────────────────────────────────────────────────────
-- Drop old foreign keys
ALTER TABLE "Sample" DROP CONSTRAINT IF EXISTS "Sample_samplePointId_fkey";
ALTER TABLE "Sample" DROP CONSTRAINT IF EXISTS "Sample_userId_fkey";
DROP INDEX IF EXISTS "Sample_samplePointId_idx";

-- Drop old columns
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "batch";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "collectedAt";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "deliveredAt";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "laboratory1";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "laboratory2";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "laboratory3";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "moisture";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "receivedAt";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "sampleNumber";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "samplePointId";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "sector";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Sample" DROP COLUMN IF EXISTS "weight";

-- Add new columns
ALTER TABLE "Sample" ADD COLUMN IF NOT EXISTS "east"           DOUBLE PRECISION;
ALTER TABLE "Sample" ADD COLUMN IF NOT EXISTS "elevation"      DOUBLE PRECISION;
ALTER TABLE "Sample" ADD COLUMN IF NOT EXISTS "miningLaborId"  TEXT;
ALTER TABLE "Sample" ADD COLUMN IF NOT EXISTS "name"           TEXT;
ALTER TABLE "Sample" ADD COLUMN IF NOT EXISTS "north"          DOUBLE PRECISION;
ALTER TABLE "Sample" ADD COLUMN IF NOT EXISTS "number"         INTEGER;
ALTER TABLE "Sample" ADD COLUMN IF NOT EXISTS "placeReference" TEXT;
ALTER TABLE "Sample" ADD COLUMN IF NOT EXISTS "sampledAt"      TIMESTAMP(3);

-- Make sampleType nullable
ALTER TABLE "Sample" ALTER COLUMN "sampleType" DROP NOT NULL;

-- Unique index on code (may already exist or have conflicts — use IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "Sample_code_key" ON "Sample"("code");

-- New indexes
CREATE INDEX IF NOT EXISTS "Sample_east_north_idx"    ON "Sample"("east", "north");
CREATE INDEX IF NOT EXISTS "Sample_miningLaborId_idx" ON "Sample"("miningLaborId");

-- FK to MiningLabor (nullable — existing rows won't have miningLaborId)
ALTER TABLE "Sample"
    ADD CONSTRAINT "Sample_miningLaborId_fkey"
    FOREIGN KEY ("miningLaborId") REFERENCES "MiningLabor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── AlterTable SampleResult ───────────────────────────────────────────────────
DROP INDEX IF EXISTS "SampleResult_sampleId_elementId_key";
ALTER TABLE "SampleResult" DROP COLUMN IF EXISTS "analyzedAt";
ALTER TABLE "SampleResult" DROP COLUMN IF EXISTS "detectionLimit";
ALTER TABLE "SampleResult" DROP COLUMN IF EXISTS "laboratory";
ALTER TABLE "SampleResult" DROP COLUMN IF EXISTS "method";
ALTER TABLE "SampleResult" DROP COLUMN IF EXISTS "upperLimit";

ALTER TABLE "SampleResult" ADD COLUMN IF NOT EXISTS "sampleLaboratoryId" TEXT;
ALTER TABLE "SampleResult" ADD COLUMN IF NOT EXISTS "sourceColumn"        TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "SampleResult_sampleId_sampleLaboratoryId_elementId_unit_sourc_key"
    ON "SampleResult"("sampleId", "sampleLaboratoryId", "elementId", "unit", "sourceColumn");
CREATE INDEX IF NOT EXISTS "SampleResult_sampleLaboratoryId_idx" ON "SampleResult"("sampleLaboratoryId");

ALTER TABLE "SampleResult"
    ADD CONSTRAINT "SampleResult_sampleLaboratoryId_fkey"
    FOREIGN KEY ("sampleLaboratoryId") REFERENCES "SampleLaboratory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── DropTable SamplePoint ─────────────────────────────────────────────────────
-- Remove FK from Sample first (already done above), then drop the table
DROP TABLE IF EXISTS "SamplePoint";
