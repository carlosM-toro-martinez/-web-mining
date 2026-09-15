/*
  Warnings:

  - You are about to drop the column `partidaPresupuestoId` on the `MovimientoBancoCaja` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "MovimientoBancoCaja" DROP CONSTRAINT "MovimientoBancoCaja_partidaPresupuestoId_fkey";

-- AlterTable
ALTER TABLE "MovimientoBancoCaja" DROP COLUMN "partidaPresupuestoId";
