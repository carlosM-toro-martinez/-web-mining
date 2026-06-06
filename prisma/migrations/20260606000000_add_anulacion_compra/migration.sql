-- Add ANULADA value to EstadoCompra enum
ALTER TYPE "EstadoCompra" ADD VALUE IF NOT EXISTS 'ANULADA';

-- CreateTable AnulacionCompra
CREATE TABLE IF NOT EXISTS "AnulacionCompra" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnulacionCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AnulacionCompra_compraId_key" ON "AnulacionCompra"("compraId");

-- AddForeignKey
ALTER TABLE "AnulacionCompra" ADD CONSTRAINT "AnulacionCompra_compraId_fkey"
    FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionCompra" ADD CONSTRAINT "AnulacionCompra_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
