ALTER TYPE "EstadoVale" ADD VALUE 'ANULADO';

CREATE TABLE "AnulacionVale" (
    "id"        TEXT NOT NULL,
    "valeId"    TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "motivo"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnulacionVale_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AnulacionVale" ADD CONSTRAINT "AnulacionVale_valeId_key" UNIQUE ("valeId");
ALTER TABLE "AnulacionVale" ADD CONSTRAINT "AnulacionVale_valeId_fkey"    FOREIGN KEY ("valeId")    REFERENCES "Vale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnulacionVale" ADD CONSTRAINT "AnulacionVale_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
