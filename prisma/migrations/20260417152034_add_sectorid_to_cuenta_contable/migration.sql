-- AlterTable
ALTER TABLE "CuentaContable" ADD COLUMN     "sectorId" INTEGER;

-- CreateTable
CREATE TABLE "Sector" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sector_codigo_key" ON "Sector"("codigo");

-- AddForeignKey
ALTER TABLE "CuentaContable" ADD CONSTRAINT "CuentaContable_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
