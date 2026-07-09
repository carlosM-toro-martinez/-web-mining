-- Agregar nuevos roles al enum Role
-- ALTER TYPE ADD VALUE IF NOT EXISTS es idempotente: no falla si el valor ya existe
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MEDIOAMBIENTE';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SEGURIDAD';
