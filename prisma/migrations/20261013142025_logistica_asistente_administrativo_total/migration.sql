-- ASISTENTE_ADMINISTRATIVO tiene acceso completo a Logística (igual que
-- SUPERINTENDENTE). La migración permisos_logistica le había dejado fuera las
-- acciones que antes eran solo de ADMIN/SUPERINTENDENTE; se le agregan aquí.
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
WHERE r."codigo" = 'ASISTENTE_ADMINISTRATIVO'
ON CONFLICT ("rolId", "recurso", "accion") DO NOTHING;
