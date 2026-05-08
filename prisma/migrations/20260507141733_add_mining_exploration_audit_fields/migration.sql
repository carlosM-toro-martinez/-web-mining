/*
  Warnings:

  - Added the required column `updatedAt` to the `Assay` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DrillHole` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Interval` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Lithology` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `QAQC` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Resource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Zone` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Assay" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" INTEGER;

-- AlterTable
ALTER TABLE "DrillHole" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" INTEGER;

-- AlterTable
ALTER TABLE "Interval" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" INTEGER;

-- AlterTable
ALTER TABLE "Lithology" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" INTEGER;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" INTEGER;

-- AlterTable
ALTER TABLE "QAQC" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" INTEGER;

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" INTEGER;

-- AlterTable
ALTER TABLE "Zone" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" INTEGER;
