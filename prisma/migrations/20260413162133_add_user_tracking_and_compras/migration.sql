/*
  Warnings:

  - Added the required column `usuarioRegistroId` to the `Compra` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Compra" ADD COLUMN     "observacion" TEXT,
ADD COLUMN     "recibidoAt" TIMESTAMP(3),
ADD COLUMN     "usuarioRecibidoId" INTEGER,
ADD COLUMN     "usuarioRegistroId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Movimiento" ADD COLUMN     "usuarioEntregaId" INTEGER,
ADD COLUMN     "usuarioRecibidoId" INTEGER;

-- AlterTable
ALTER TABLE "Vale" ADD COLUMN     "almaceneroId" INTEGER;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_usuarioEntregaId_fkey" FOREIGN KEY ("usuarioEntregaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_usuarioRecibidoId_fkey" FOREIGN KEY ("usuarioRecibidoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_usuarioRegistroId_fkey" FOREIGN KEY ("usuarioRegistroId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_usuarioRecibidoId_fkey" FOREIGN KEY ("usuarioRecibidoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vale" ADD CONSTRAINT "Vale_almaceneroId_fkey" FOREIGN KEY ("almaceneroId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
