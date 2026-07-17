#!/bin/sh
set -e

# Baseline one-time: elimina el historial viejo y marca el init como aplicado.
# Es seguro correrlo en cada arranque: si ya está aplicado, no hace nada.
npx prisma db execute --schema prisma/schema.prisma --stdin << 'SQL'
DELETE FROM "_prisma_migrations"
WHERE migration_name NOT IN (
  '20260717120000_init',
  '20260717173121_add_tiene_iva_to_compra'
);
SQL

npx prisma migrate resolve --applied 20260717120000_init 2>/dev/null || true

# Aplica migraciones pendientes (primera vez: add_tiene_iva; luego: las nuevas que vengan)
npx prisma migrate deploy

exec node dist/src/server.js
