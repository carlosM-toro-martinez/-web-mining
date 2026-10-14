-- Logística pasa a permisos dinámicos. Se siembran permisos equivalentes a
-- los authorize(...) que tenía cada ruta (ADMIN tiene acceso total por código):
--
--   SUPERINTENDENTE           -> todo Logística
--   ASISTENTE_ADMINISTRATIVO  -> todo, salvo lo que antes era solo
--                                ADMIN/SUPERINTENDENTE: eliminar en flota
--                                (transportistas), importar histórico de lotes,
--                                anular F101, cerrar y anular liquidaciones y
--                                cierre mensual.

INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT r."id", p."recurso", p."accion"
FROM "Rol" r
CROSS JOIN (VALUES
  ('logistica.parametros',    'ver'),
  ('logistica.parametros',    'crear'),
  ('logistica.parametros',    'editar'),
  ('logistica.parametros',    'eliminar'),
  ('logistica.flota',         'ver'),
  ('logistica.flota',         'crear'),
  ('logistica.flota',         'editar'),
  ('logistica.lotes',         'ver'),
  ('logistica.lotes',         'crear'),
  ('logistica.lotes',         'editar'),
  ('logistica.lotes',         'anular'),
  ('logistica.f101',          'ver'),
  ('logistica.f101',          'gestionar'),
  ('logistica.liquidaciones', 'ver'),
  ('logistica.liquidaciones', 'crear'),
  ('logistica.liquidaciones', 'editar'),
  ('logistica.liquidaciones', 'eliminar'),
  ('logistica.reportes',      'ver')
) AS p("recurso", "accion")
WHERE r."codigo" IN ('SUPERINTENDENTE', 'ASISTENTE_ADMINISTRATIVO')
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;

-- Acciones que antes eran solo de ADMIN/SUPERINTENDENTE
INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT r."id", p."recurso", p."accion"
FROM "Rol" r
CROSS JOIN (VALUES
  ('logistica.flota',         'eliminar'),
  ('logistica.lotes',         'importar'),
  ('logistica.f101',          'anular'),
  ('logistica.liquidaciones', 'cerrar'),
  ('logistica.liquidaciones', 'anular'),
  ('logistica.reportes',      'cerrar_mes')
) AS p("recurso", "accion")
WHERE r."codigo" = 'SUPERINTENDENTE'
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;
