-- Renombra el concepto "Remitente" a "Transportista" en todo el esquema.
-- Esto preserva TODOS los datos existentes: es un rename (tabla, columnas,
-- constraints, índices y enum), nunca un drop+create.

-- 1. Enum
ALTER TYPE "TipoEntidadRemitente" RENAME TO "TipoEntidadTransportista";

-- 2. Tabla Remitente -> Transportista (+ constraints e índices propios)
ALTER TABLE "Remitente" RENAME TO "Transportista";

ALTER TABLE "Transportista" RENAME CONSTRAINT "Remitente_pkey" TO "Transportista_pkey";
ALTER TABLE "Transportista" RENAME CONSTRAINT "Remitente_cuentaContableId_fkey" TO "Transportista_cuentaContableId_fkey";
ALTER TABLE "Transportista" RENAME CONSTRAINT "Remitente_municipioId_fkey" TO "Transportista_municipioId_fkey";

-- El pkey ya quedó renombrado como efecto colateral del RENAME CONSTRAINT
-- de arriba (Postgres renombra el índice subyacente junto con la
-- constraint); solo faltan los índices no asociados a una constraint.
ALTER INDEX "Remitente_cuentaContableId_idx" RENAME TO "Transportista_cuentaContableId_idx";
ALTER INDEX "Remitente_municipioId_idx" RENAME TO "Transportista_municipioId_idx";

-- 3. LoteDespacho.remitenteId -> transportistaId
ALTER TABLE "LoteDespacho" RENAME COLUMN "remitenteId" TO "transportistaId";
ALTER TABLE "LoteDespacho" RENAME CONSTRAINT "LoteDespacho_remitenteId_fkey" TO "LoteDespacho_transportistaId_fkey";
ALTER INDEX "LoteDespacho_remitenteId_idx" RENAME TO "LoteDespacho_transportistaId_idx";

-- 4. LiquidacionPeriodo.remitenteId -> transportistaId
ALTER TABLE "LiquidacionPeriodo" RENAME COLUMN "remitenteId" TO "transportistaId";
ALTER TABLE "LiquidacionPeriodo" RENAME CONSTRAINT "LiquidacionPeriodo_remitenteId_fkey" TO "LiquidacionPeriodo_transportistaId_fkey";
ALTER INDEX "LiquidacionPeriodo_remitenteId_idx" RENAME TO "LiquidacionPeriodo_transportistaId_idx";

-- 5. Vehiculo.propietarioId ya apunta a Transportista automaticamente
-- (Postgres rastrea FKs por OID de tabla, no por nombre) — sin cambios.

-- 6. Nueva tarifa negociada por transportista puntual (contrato especial).
-- Nullable: si es NULL, la tarifa sigue aplicando genericamente al tipoEntidad.
ALTER TABLE "TarifaLiquidacion" ADD COLUMN "transportistaId" INTEGER;

ALTER TABLE "TarifaLiquidacion"
  ADD CONSTRAINT "TarifaLiquidacion_transportistaId_fkey"
  FOREIGN KEY ("transportistaId") REFERENCES "Transportista"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE INDEX "TarifaLiquidacion_transportistaId_idx" ON "TarifaLiquidacion"("transportistaId");
