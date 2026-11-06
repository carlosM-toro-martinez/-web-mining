-- Inventario pasa a permisos dinámicos. Se siembran permisos equivalentes a los
-- authorize(...) que tenía cada ruta, para que nadie gane ni pierda acceso con
-- este cambio (ADMIN tiene acceso total por código y no necesita filas).
--
--   ALMACENERO       -> operar compras, pedidos, vales, productos, stock y
--                       reportes; proveedores y contabilidad (crear/editar).
--   SUPERINTENDENTE  -> lo mismo, pero sin crear/editar proveedores ni
--                       contabilidad, y además cierre mensual y diagnósticos.
--   CONTADOR         -> reportes y contabilidad (solo ver).
--
-- Las acciones que antes eran solo de ADMIN (ajustes, correcciones, backfill,
-- eliminar vale/proveedor, etc.) siguen siendo solo de ADMIN y no se asignan.
-- Lo mismo con "cancelar pedido" y "eliminar producto/categoría": el servidor
-- los permitía a ALMACENERO y SUPERINTENDENTE pero la pantalla solo los ofrecía
-- a ADMIN, así que no se asignan por defecto (se pueden conceder desde
-- Roles y permisos).

-- Operación de almacén: ALMACENERO y SUPERINTENDENTE
INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT r."id", p."recurso", p."accion"
FROM "Rol" r
CROSS JOIN (VALUES
  ('inventario.compras',         'ver'),
  ('inventario.compras',         'crear'),
  ('inventario.compras',         'recibir'),
  ('inventario.compras',         'anular'),
  ('inventario.compras',         'ver_anulaciones'),
  ('inventario.pedidos',         'ver'),
  ('inventario.pedidos',         'crear'),
  ('inventario.vales',           'ver'),
  ('inventario.vales',           'aprobar'),
  ('inventario.vales',           'entregar'),
  ('inventario.vales',           'rechazar'),
  ('inventario.vales',           'anular'),
  ('inventario.vales',           'ver_resumenes'),
  ('inventario.vales_historicos','ver'),
  ('inventario.productos',       'ver'),
  ('inventario.productos',       'crear'),
  ('inventario.productos',       'editar'),
  ('inventario.proveedores',     'ver'),
  ('inventario.stock',           'ver'),
  ('inventario.stock',           'importar'),
  ('inventario.stock',           'movimientos_manuales'),
  ('inventario.reportes',        'ver'),
  ('inventario.contabilidad',    'ver')
) AS p("recurso", "accion")
WHERE r."codigo" IN ('ALMACENERO', 'SUPERINTENDENTE')
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;

-- Solo ALMACENERO (antes: ADMIN y ALMACENERO)
INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT r."id", p."recurso", p."accion"
FROM "Rol" r
CROSS JOIN (VALUES
  ('inventario.proveedores',  'crear'),
  ('inventario.proveedores',  'editar'),
  ('inventario.contabilidad', 'editar')
) AS p("recurso", "accion")
WHERE r."codigo" = 'ALMACENERO'
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;

-- Solo SUPERINTENDENTE (antes: ADMIN y SUPERINTENDENTE)
INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT r."id", p."recurso", p."accion"
FROM "Rol" r
CROSS JOIN (VALUES
  ('inventario.cierre', 'cerrar_mes'),
  ('inventario.cierre', 'reabrir_mes'),
  ('inventario.cierre', 'diagnosticos')
) AS p("recurso", "accion")
WHERE r."codigo" = 'SUPERINTENDENTE'
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;

-- CONTADOR: reportes y contabilidad (solo consulta)
INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT r."id", p."recurso", p."accion"
FROM "Rol" r
CROSS JOIN (VALUES
  ('inventario.reportes',     'ver'),
  ('inventario.contabilidad', 'ver')
) AS p("recurso", "accion")
WHERE r."codigo" = 'CONTADOR'
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;
