#!/bin/sh
set -e

# El baseline de julio (borrar el historial y resolver "init" a mano) ya
# cumplió su propósito una sola vez, en el primer despliegue. Dejarlo
# corriendo en cada arranque borraba el registro de migraciones ya
# aplicadas en producción (ej. precision_precio_unit_prom_6dp,
# add_es_gas_especial_to_compra, add_total_bs_to_compra_item) y hacía que
# "migrate deploy" intentara recrearlas sobre columnas que ya existen.
# "migrate deploy" por sí solo ya es idempotente y seguro en cada arranque:
# aplica solo las migraciones que de verdad faltan, en orden.
npx prisma migrate deploy

# Semilla idempotente de catálogos base de Caja Chica (funciones de gasto,
# centros de costo, cuentas contables, cajas y tasas de retención). Usa
# upsert por código, así que es seguro correrla en cada arranque.
node dist/src/seedCajaChica.js

exec node dist/src/server.js
