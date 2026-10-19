-- Limpieza de datos (sin cambios de esquema): 2 entradas de diésel de mayo 2026 que quedaron
-- huérfanas de la compra 8580ec73, anulada por error de tipeo (precio escrito como 147.000,23 por litro).
--
-- La compra figura con 0 recibido y sin contra-asiento, pero la recepción dejó 2 movimientos de entrada
-- (15.000,01 L c/u, a Bs 84.216 por litro) que inflan el bin card del diésel de mayo en 30.000,02 L.
-- Ningún reporte los usa (se arman con las compras no anuladas y el saldo mensual).
--
-- Condiciones estrictas: solo esa compra, solo entradas, solo si sigue anulada, sin cantidad recibida
-- y sin contra-asiento. Si ya no existen, no hace nada.

DELETE FROM "Movimiento" m
USING "Compra" c
WHERE c."id" = '8580ec73-febd-487d-bfb1-04154415cbfa'
  AND m."referencia" = 'COMPRA'
  AND m."referenciaId" = c."id"
  AND m."tipo" = 'ENTRADA'
  AND c."estado" = 'ANULADA'
  AND NOT EXISTS (
    SELECT 1 FROM "CompraItem" ci WHERE ci."compraId" = c."id" AND ci."cantidadRecibida" > 0
  )
  AND NOT EXISTS (
    SELECT 1 FROM "Movimiento" a WHERE a."referencia" = 'ANULACION_COMPRA' AND a."referenciaId" = c."id"
  );
