-- Movimiento: campos para soporte retroactivo
ALTER TABLE "Movimiento"
  ADD COLUMN "esRetroactivo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "periodoAnio"   INTEGER,
  ADD COLUMN "periodoMes"    INTEGER;

-- Vale: fecha real de operación (para registros históricos)
ALTER TABLE "Vale"
  ADD COLUMN "fechaOperacion" TIMESTAMP(3);

-- Compra: fecha real de operación (para registros históricos)
ALTER TABLE "Compra"
  ADD COLUMN "fechaOperacion" TIMESTAMP(3);

-- Nueva tabla: control de cierres mensuales
CREATE TABLE "CierreMes" (
    "id"        SERIAL PRIMARY KEY,
    "anio"      INTEGER NOT NULL,
    "mes"       INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "creadoAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CierreMes_anio_mes_key" UNIQUE ("anio", "mes")
);
