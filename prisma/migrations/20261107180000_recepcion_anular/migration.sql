-- Anular una compra ya recibida pasa a ser un permiso de Recepción de compras
-- (revierte el stock con contra-asientos); anular un pedido que todavía no
-- llegó sigue siendo "Pedidos de compra: Anular" (no mueve stock).
--
-- Para que nadie pierda acceso: quien podía anular compras conserva ambas cosas,
-- y quien podía ver el historial de anulaciones lo ve en las dos pantallas.
-- ADMIN no necesita filas (acceso total por código).

INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT rp."rolId", 'inventario.recepcion', 'anular'
FROM "RolPermiso" rp
WHERE rp."recurso" = 'inventario.compras' AND rp."accion" = 'anular'
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;

INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT rp."rolId", 'inventario.recepcion', 'ver_anulaciones'
FROM "RolPermiso" rp
WHERE rp."recurso" = 'inventario.compras' AND rp."accion" = 'ver_anulaciones'
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;

-- Un rol que solo puede ver anulaciones necesita también ver la pantalla de recepción
INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT DISTINCT rp."rolId", 'inventario.recepcion', 'ver'
FROM "RolPermiso" rp
WHERE rp."recurso" = 'inventario.recepcion' AND rp."accion" IN ('anular', 'ver_anulaciones')
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;
