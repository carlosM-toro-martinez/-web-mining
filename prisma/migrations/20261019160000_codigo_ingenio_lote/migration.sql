-- Código de ingenio: el código que el ingenio le asigna a cada viaje en su balanza.
-- Se anota al pasar el lote a balanza (o al registrar el pesaje) o después, editando el lote.
-- Es opcional: los lotes que ya existen quedan sin código.
ALTER TABLE "LoteDespacho" ADD COLUMN "codigoIngenio" TEXT;

CREATE INDEX "LoteDespacho_codigoIngenio_idx" ON "LoteDespacho"("codigoIngenio");
