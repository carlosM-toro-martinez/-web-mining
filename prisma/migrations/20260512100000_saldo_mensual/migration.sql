-- Add numeroFactura and descuento to Compra
ALTER TABLE "Compra" ADD COLUMN IF NOT EXISTS "numeroFactura" TEXT;
ALTER TABLE "Compra" ADD COLUMN IF NOT EXISTS "descuento" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateTable SaldoMensual
CREATE TABLE IF NOT EXISTS "SaldoMensual" (
    "id"           TEXT          NOT NULL,
    "productoId"   INTEGER       NOT NULL,
    "anio"         INTEGER       NOT NULL,
    "mes"          INTEGER       NOT NULL,
    "saldoInicial" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "ingresoQty"   DECIMAL(14,4) NOT NULL DEFAULT 0,
    "salidaQty"    DECIMAL(14,4) NOT NULL DEFAULT 0,
    "saldoFinal"   DECIMAL(14,4) NOT NULL DEFAULT 0,
    "precioUnit"   DECIMAL(14,4) NOT NULL DEFAULT 0,
    "totalBs"      DECIMAL(14,4) NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaldoMensual_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SaldoMensual_productoId_anio_mes_key"
    ON "SaldoMensual"("productoId", "anio", "mes");

CREATE INDEX IF NOT EXISTS "SaldoMensual_anio_mes_idx"
    ON "SaldoMensual"("anio", "mes");

ALTER TABLE "SaldoMensual"
    ADD CONSTRAINT "SaldoMensual_productoId_fkey"
    FOREIGN KEY ("productoId") REFERENCES "Producto"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
