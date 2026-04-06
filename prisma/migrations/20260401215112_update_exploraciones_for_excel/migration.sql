/*
  Warnings:

  - You are about to drop the column `codigo` on the `Muestra` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `Muestra` table. All the data in the column will be lost.
  - You are about to drop the column `galeria` on the `Ubicacion` table. All the data in the column will be lost.
  - You are about to drop the column `punto` on the `Ubicacion` table. All the data in the column will be lost.
  - You are about to drop the column `sector` on the `Ubicacion` table. All the data in the column will be lost.
  - You are about to drop the column `x` on the `Ubicacion` table. All the data in the column will be lost.
  - You are about to drop the column `y` on the `Ubicacion` table. All the data in the column will be lost.
  - You are about to drop the column `z` on the `Ubicacion` table. All the data in the column will be lost.
  - You are about to drop the `Atributo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MuestraAtributo` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `nombre` to the `Muestra` table without a default value. This is not possible if the table is not empty.
  - Made the column `nivel` on table `Ubicacion` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "MuestraAtributo" DROP CONSTRAINT "MuestraAtributo_atributoId_fkey";

-- DropForeignKey
ALTER TABLE "MuestraAtributo" DROP CONSTRAINT "MuestraAtributo_muestraId_fkey";

-- AlterTable
ALTER TABLE "Muestra" DROP COLUMN "codigo",
DROP COLUMN "tipo",
ADD COLUMN     "laboratorio1" TEXT,
ADD COLUMN     "laboratorio2" TEXT,
ADD COLUMN     "laboratorio3" TEXT,
ADD COLUMN     "nombre" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Ubicacion" DROP COLUMN "galeria",
DROP COLUMN "punto",
DROP COLUMN "sector",
DROP COLUMN "x",
DROP COLUMN "y",
DROP COLUMN "z",
ADD COLUMN     "este" DOUBLE PRECISION,
ADD COLUMN     "norte" DOUBLE PRECISION,
ADD COLUMN     "referenciaLugar" TEXT,
ALTER COLUMN "nivel" SET NOT NULL;

-- DropTable
DROP TABLE "Atributo";

-- DropTable
DROP TABLE "MuestraAtributo";
