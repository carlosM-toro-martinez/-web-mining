-- ────────────────────────────────────────────────────────────────────────────
-- Módulo Ambiental: puntos de monitoreo, registros hídricos, residuos,
-- ruido/emisiones, suelo/biodiversidad, pozos sépticos, manifiestos
-- Todos los enums usan DO...EXCEPTION para ser idempotentes en producción.
-- ────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "TipoPunto" AS ENUM ('HIDRICO','SUELO','RUIDO','RESIDUOS','POZO_SEPTICO','GENERAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CalidadAgua" AS ENUM ('EXCELENTE','BUENA','REGULAR','MALA','CRITICA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoResiduo" AS ENUM ('SOLIDO_PELIGROSO','SOLIDO_NO_PELIGROSO','LIQUIDO_PELIGROSO','LIQUIDO_NO_PELIGROSO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoInfraestructura" AS ENUM ('BUENO','REGULAR','MALO','CRITICO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- PuntoMonitoreo
CREATE TABLE IF NOT EXISTS "PuntoMonitoreo" (
  "id"          SERIAL PRIMARY KEY,
  "nombre"      TEXT NOT NULL,
  "descripcion" TEXT,
  "latitud"     DOUBLE PRECISION NOT NULL,
  "longitud"    DOUBLE PRECISION NOT NULL,
  "tipo"        "TipoPunto" NOT NULL DEFAULT 'GENERAL',
  "activo"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PuntoMonitoreo_tipo_idx" ON "PuntoMonitoreo"("tipo");

-- RegistroHidrico
CREATE TABLE IF NOT EXISTS "RegistroHidrico" (
  "id"                SERIAL PRIMARY KEY,
  "puntoId"           INTEGER NOT NULL,
  "fecha"             TIMESTAMP(3) NOT NULL,
  "ph"                DOUBLE PRECISION,
  "turbidez"          DOUBLE PRECISION,
  "conductividad"     DOUBLE PRECISION,
  "oxigenoDisuelto"   DOUBLE PRECISION,
  "temperatura"       DOUBLE PRECISION,
  "coliformesFecales" DOUBLE PRECISION,
  "calidadAgua"       "CalidadAgua" NOT NULL DEFAULT 'BUENA',
  "observaciones"     TEXT,
  "usuarioId"         INTEGER NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistroHidrico_puntoId_fkey"   FOREIGN KEY ("puntoId")   REFERENCES "PuntoMonitoreo"("id"),
  CONSTRAINT "RegistroHidrico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "RegistroHidrico_puntoId_idx" ON "RegistroHidrico"("puntoId");
CREATE INDEX IF NOT EXISTS "RegistroHidrico_fecha_idx"   ON "RegistroHidrico"("fecha");

-- RegistroResiduo
CREATE TABLE IF NOT EXISTS "RegistroResiduo" (
  "id"            SERIAL PRIMARY KEY,
  "puntoId"       INTEGER,
  "fecha"         TIMESTAMP(3) NOT NULL,
  "tipoResiduo"   "TipoResiduo" NOT NULL,
  "cantidad"      DOUBLE PRECISION NOT NULL,
  "unidad"        TEXT NOT NULL,
  "disposicion"   TEXT NOT NULL,
  "empresa"       TEXT,
  "manifiestoNum" TEXT,
  "observaciones" TEXT,
  "usuarioId"     INTEGER NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistroResiduo_puntoId_fkey"   FOREIGN KEY ("puntoId")   REFERENCES "PuntoMonitoreo"("id"),
  CONSTRAINT "RegistroResiduo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "RegistroResiduo_puntoId_idx" ON "RegistroResiduo"("puntoId");
CREATE INDEX IF NOT EXISTS "RegistroResiduo_fecha_idx"   ON "RegistroResiduo"("fecha");

-- RegistroRuido
CREATE TABLE IF NOT EXISTS "RegistroRuido" (
  "id"              SERIAL PRIMARY KEY,
  "puntoId"         INTEGER NOT NULL,
  "fecha"           TIMESTAMP(3) NOT NULL,
  "nivelRuido"      DOUBLE PRECISION NOT NULL,
  "limitePermitido" DOUBLE PRECISION,
  "particulasPm10"  DOUBLE PRECISION,
  "particulasPm25"  DOUBLE PRECISION,
  "observaciones"   TEXT,
  "usuarioId"       INTEGER NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistroRuido_puntoId_fkey"   FOREIGN KEY ("puntoId")   REFERENCES "PuntoMonitoreo"("id"),
  CONSTRAINT "RegistroRuido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "RegistroRuido_puntoId_idx" ON "RegistroRuido"("puntoId");
CREATE INDEX IF NOT EXISTS "RegistroRuido_fecha_idx"   ON "RegistroRuido"("fecha");

-- RegistroSuelo
CREATE TABLE IF NOT EXISTS "RegistroSuelo" (
  "id"                  SERIAL PRIMARY KEY,
  "puntoId"             INTEGER NOT NULL,
  "fecha"               TIMESTAMP(3) NOT NULL,
  "ph"                  DOUBLE PRECISION,
  "conductividad"       DOUBLE PRECISION,
  "materiaOrganica"     DOUBLE PRECISION,
  "especiesRegistradas" TEXT,
  "observaciones"       TEXT,
  "usuarioId"           INTEGER NOT NULL,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistroSuelo_puntoId_fkey"   FOREIGN KEY ("puntoId")   REFERENCES "PuntoMonitoreo"("id"),
  CONSTRAINT "RegistroSuelo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "RegistroSuelo_puntoId_idx" ON "RegistroSuelo"("puntoId");
CREATE INDEX IF NOT EXISTS "RegistroSuelo_fecha_idx"   ON "RegistroSuelo"("fecha");

-- PozoSeptico
CREATE TABLE IF NOT EXISTS "PozoSeptico" (
  "id"              SERIAL PRIMARY KEY,
  "nombre"          TEXT NOT NULL,
  "descripcion"     TEXT,
  "latitud"         DOUBLE PRECISION NOT NULL,
  "longitud"        DOUBLE PRECISION NOT NULL,
  "capacidadM3"     DOUBLE PRECISION,
  "estado"          "EstadoInfraestructura" NOT NULL DEFAULT 'BUENO',
  "ultimaLimpieza"  TIMESTAMP(3),
  "proximaLimpieza" TIMESTAMP(3),
  "observaciones"   TEXT,
  "activo"          BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ManifiestoAmbiental
CREATE TABLE IF NOT EXISTS "ManifiestoAmbiental" (
  "id"          SERIAL PRIMARY KEY,
  "anio"        INTEGER NOT NULL,
  "titulo"      TEXT NOT NULL,
  "descripcion" TEXT,
  "objetivos"   TEXT,
  "compromisos" TEXT,
  "responsable" TEXT,
  "aprobadoAt"  TIMESTAMP(3),
  "usuarioId"   INTEGER NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManifiestoAmbiental_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "ManifiestoAmbiental_anio_idx" ON "ManifiestoAmbiental"("anio");
