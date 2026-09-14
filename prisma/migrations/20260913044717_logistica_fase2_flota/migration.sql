-- CreateEnum
CREATE TYPE "EstadoVehiculo" AS ENUM ('DISPONIBLE', 'EN_TRANSITO', 'EN_BALANZA', 'CON_FALLA_MECANICA', 'EN_MANTENIMIENTO');

-- CreateEnum
CREATE TYPE "OrigenCambioFlota" AS ENUM ('MANUAL', 'API_GPS');

-- CreateTable
CREATE TABLE "Remitente" (
    "id" SERIAL NOT NULL,
    "tipoEntidad" "TipoEntidadRemitente" NOT NULL,
    "nombreORazonSocial" TEXT NOT NULL,
    "nitOCi" TEXT NOT NULL,
    "municipioId" INTEGER,
    "cuentaContableId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Remitente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" SERIAL NOT NULL,
    "placa" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "capacidadTon" DECIMAL(8,2) NOT NULL,
    "propietarioId" INTEGER,
    "estadoActual" "EstadoVehiculo" NOT NULL DEFAULT 'DISPONIBLE',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chofer" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "licencia" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Chofer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoFlotaHistorico" (
    "id" TEXT NOT NULL,
    "vehiculoId" INTEGER NOT NULL,
    "estado" "EstadoVehiculo" NOT NULL,
    "motivo" TEXT,
    "origenCambio" "OrigenCambioFlota" NOT NULL DEFAULT 'MANUAL',
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstadoFlotaHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Remitente_municipioId_idx" ON "Remitente"("municipioId");

-- CreateIndex
CREATE INDEX "Remitente_cuentaContableId_idx" ON "Remitente"("cuentaContableId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_placa_key" ON "Vehiculo"("placa");

-- CreateIndex
CREATE INDEX "Vehiculo_propietarioId_idx" ON "Vehiculo"("propietarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Chofer_ci_key" ON "Chofer"("ci");

-- CreateIndex
CREATE INDEX "EstadoFlotaHistorico_vehiculoId_idx" ON "EstadoFlotaHistorico"("vehiculoId");

-- AddForeignKey
ALTER TABLE "Remitente" ADD CONSTRAINT "Remitente_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "MunicipioOrigen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remitente" ADD CONSTRAINT "Remitente_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "CuentaContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehiculo" ADD CONSTRAINT "Vehiculo_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Remitente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoFlotaHistorico" ADD CONSTRAINT "EstadoFlotaHistorico_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoFlotaHistorico" ADD CONSTRAINT "EstadoFlotaHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
