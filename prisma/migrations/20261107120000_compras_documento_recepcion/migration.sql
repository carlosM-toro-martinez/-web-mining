-- Compras: tipo de documento (factura, recibo o sin documento) y recepción como permiso propio.
--
-- 1. Cada compra puede tener su documento: FACTURA, RECIBO o SIN_DOCUMENTO.
--    NULL = todavía no se registró. El número sigue en "numeroFactura".
-- 2. Las compras que ya traían número de factura se marcan como FACTURA (es el
--    campo donde se cargaba), con la fecha de creación como fecha de registro.
--    Las que no tenían número quedan sin documento registrado (NULL).
-- 3. Permisos: "Recibir" pasa de Compras a un recurso propio (Recepción de
--    compras), para poder dar la pantalla de pedidos y la de recepción a roles
--    distintos. Quien podía recibir conserva ver + recibir; quien podía crear
--    una compra puede registrar su documento. Las filas viejas de
--    "inventario.compras:recibir" se dejan sin tocar: el catálogo ya no las
--    lista y no hacen nada, pero así el cambio es seguro aunque el código
--    nuevo y la migración no lleguen en el mismo instante.

CREATE TYPE "TipoDocumentoCompra" AS ENUM ('FACTURA', 'RECIBO', 'SIN_DOCUMENTO');

ALTER TABLE "Compra"
  ADD COLUMN "tipoDocumento" "TipoDocumentoCompra",
  ADD COLUMN "documentoRegistradoAt" TIMESTAMP(3);

UPDATE "Compra"
SET "tipoDocumento" = 'FACTURA',
    "documentoRegistradoAt" = "createdAt"
WHERE "numeroFactura" IS NOT NULL
  AND btrim("numeroFactura") <> '';

INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT rp."rolId", p."recurso", p."accion"
FROM "RolPermiso" rp
CROSS JOIN (VALUES
  ('inventario.recepcion', 'ver'),
  ('inventario.recepcion', 'recibir')
) AS p("recurso", "accion")
WHERE rp."recurso" = 'inventario.compras' AND rp."accion" = 'recibir'
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;

INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT rp."rolId", 'inventario.compras', 'documento'
FROM "RolPermiso" rp
WHERE rp."recurso" = 'inventario.compras' AND rp."accion" = 'crear'
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;
