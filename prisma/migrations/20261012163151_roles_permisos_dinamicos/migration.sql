-- Roles y permisos dinámicos (fase 1).
--
-- El enum "Role" pasa a ser la tabla "Rol" y User.role pasa a TEXT con FK a
-- Rol.codigo. Prisma generaba DROP COLUMN + ADD COLUMN (perdía el rol de
-- todos los usuarios); se reescribió a mano para convertir la columna en
-- sitio con USING role::text y conservar los datos.

-- 1. Tabla de roles
CREATE TABLE "Rol" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Rol_codigo_key" ON "Rol"("codigo");

-- 2. Los 12 roles que existían en el enum, como roles de sistema
INSERT INTO "Rol" ("codigo", "nombre", "descripcion", "esSistema", "updatedAt") VALUES
  ('ADMIN',                    'Admin',                    'Acceso total al sistema. Sus permisos no se pueden editar.', true, CURRENT_TIMESTAMP),
  ('ADMINISTRADOR',            'Administrador',            NULL, true, CURRENT_TIMESTAMP),
  ('SUPERINTENDENTE',          'Superintendente',          NULL, true, CURRENT_TIMESTAMP),
  ('ALMACENERO',               'Almacenero',               NULL, true, CURRENT_TIMESTAMP),
  ('ASISTENTE_ADMINISTRATIVO', 'Asistente administrativo', NULL, true, CURRENT_TIMESTAMP),
  ('CONTADOR',                 'Contador',                 NULL, true, CURRENT_TIMESTAMP),
  ('GEOLOGOADMIN',             'Geólogo admin',            NULL, true, CURRENT_TIMESTAMP),
  ('GEOLOGO',                  'Geólogo',                  NULL, true, CURRENT_TIMESTAMP),
  ('MEDIOAMBIENTE',            'Medio ambiente',           NULL, true, CURRENT_TIMESTAMP),
  ('SEGURIDAD',                'Seguridad',                NULL, true, CURRENT_TIMESTAMP),
  ('TRABAJADOR',               'Trabajador',               NULL, true, CURRENT_TIMESTAMP),
  ('VISITANTE',                'Visitante',                NULL, true, CURRENT_TIMESTAMP);

-- 3. User.role: enum -> TEXT conservando el valor de cada usuario
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::text;

ALTER TABLE "User" ADD CONSTRAINT "User_role_fkey" FOREIGN KEY ("role") REFERENCES "Rol"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE "Role";

-- 4. Permisos por rol
CREATE TABLE "RolPermiso" (
    "id" SERIAL NOT NULL,
    "rolId" INTEGER NOT NULL,
    "recurso" TEXT NOT NULL,
    "accion" TEXT NOT NULL,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RolPermiso_rolId_idx" ON "RolPermiso"("rolId");

CREATE UNIQUE INDEX "RolPermiso_rolId_recurso_accion_key" ON "RolPermiso"("rolId", "recurso", "accion");

ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Permisos del módulo Personal equivalentes a lo que había antes:
--    ADMINISTRADOR y SUPERINTENDENTE tenían acceso completo a Personal,
--    salvo el estado del biométrico (solo ADMIN). ADMIN no necesita filas:
--    tiene acceso total por código.
INSERT INTO "RolPermiso" ("rolId", "recurso", "accion")
SELECT r."id", p."recurso", p."accion"
FROM "Rol" r
CROSS JOIN (VALUES
  ('personal.empleados',    'ver'),
  ('personal.empleados',    'crear'),
  ('personal.empleados',    'editar'),
  ('personal.empleados',    'eliminar'),
  ('personal.horarios',     'ver'),
  ('personal.horarios',     'crear'),
  ('personal.horarios',     'editar'),
  ('personal.horarios',     'eliminar'),
  ('personal.asignaciones', 'ver'),
  ('personal.asignaciones', 'crear'),
  ('personal.asignaciones', 'eliminar'),
  ('personal.ausencias',    'ver'),
  ('personal.ausencias',    'crear'),
  ('personal.ausencias',    'editar'),
  ('personal.ausencias',    'eliminar'),
  ('personal.asistencia',   'ver'),
  ('personal.biometrico',   'ver'),
  ('personal.biometrico',   'sincronizar')
) AS p("recurso", "accion")
WHERE r."codigo" IN ('ADMINISTRADOR', 'SUPERINTENDENTE');
