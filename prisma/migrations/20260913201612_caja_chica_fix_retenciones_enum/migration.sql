-- AlterEnum
-- Postgres no soporta DROP VALUE en un enum; se recrea el tipo sin
-- IUE_SERVICIOS (que se elimino del schema por no corresponder a la
-- practica contable real: los servicios usan RC-IVA, no IUE).
BEGIN;
CREATE TYPE "TipoRetencionCaja_new" AS ENUM ('RC_IVA', 'IUE_COMPRAS', 'IT');
ALTER TABLE "ConceptoRetencionCaja" ALTER COLUMN "codigo" TYPE "TipoRetencionCaja_new" USING ("codigo"::text::"TipoRetencionCaja_new");
ALTER TYPE "TipoRetencionCaja" RENAME TO "TipoRetencionCaja_old";
ALTER TYPE "TipoRetencionCaja_new" RENAME TO "TipoRetencionCaja";
DROP TYPE "TipoRetencionCaja_old";
COMMIT;
