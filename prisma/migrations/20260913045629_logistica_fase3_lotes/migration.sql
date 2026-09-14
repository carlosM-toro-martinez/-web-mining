-- CreateEnum
CREATE TYPE "EstadoLoteDespacho" AS ENUM ('REGISTRADO', 'EN_TRANSITO', 'EN_BALANZA', 'PESADO', 'ACOPIADO', 'LIQUIDADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "EstadoFormulario101" AS ENUM ('PENDIENTE', 'REGULARIZADO');

-- CreateTable
CREATE TABLE "LoteDespacho" (
    "id" TEXT NOT NULL,
    "correlativo" TEXT NOT NULL,
    "municipioOrigenId" INTEGER NOT NULL,
    "remitenteId" INTEGER NOT NULL,
    "vehiculoId" INTEGER NOT NULL,
    "choferId" INTEGER NOT NULL,
    "tipoMineralId" INTEGER NOT NULL,
    "destinoIngenioId" INTEGER NOT NULL,
    "nivel" TEXT,
    "fechaDespachoReal" TIMESTAMP(3) NOT NULL,
    "fechaDocumentalFiscal" TIMESTAMP(3) NOT NULL,
    "codigoFormulario101" TEXT,
    "estadoFormulario101" "EstadoFormulario101" NOT NULL DEFAULT 'PENDIENTE',
    "estadoLote" "EstadoLoteDespacho" NOT NULL DEFAULT 'REGISTRADO',
    "usuarioRegistroId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoteDespacho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConocimientoCarga" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "copiasEmitidas" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConocimientoCarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PesajeIngenio" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "tonelajeBruto" DECIMAL(10,3) NOT NULL,
    "tonelajeTara" DECIMAL(10,3) NOT NULL,
    "tonelajeNeto" DECIMAL(10,3) NOT NULL,
    "fechaPesaje" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PesajeIngenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnulacionLote" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnulacionLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrelativoContador" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrelativoContador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoteDespacho_correlativo_key" ON "LoteDespacho"("correlativo");

-- CreateIndex
CREATE INDEX "LoteDespacho_municipioOrigenId_idx" ON "LoteDespacho"("municipioOrigenId");

-- CreateIndex
CREATE INDEX "LoteDespacho_remitenteId_idx" ON "LoteDespacho"("remitenteId");

-- CreateIndex
CREATE INDEX "LoteDespacho_vehiculoId_idx" ON "LoteDespacho"("vehiculoId");

-- CreateIndex
CREATE INDEX "LoteDespacho_estadoLote_idx" ON "LoteDespacho"("estadoLote");

-- CreateIndex
CREATE UNIQUE INDEX "ConocimientoCarga_loteId_key" ON "ConocimientoCarga"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "PesajeIngenio_loteId_key" ON "PesajeIngenio"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "AnulacionLote_loteId_key" ON "AnulacionLote"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "CorrelativoContador_clave_key" ON "CorrelativoContador"("clave");

-- AddForeignKey
ALTER TABLE "LoteDespacho" ADD CONSTRAINT "LoteDespacho_municipioOrigenId_fkey" FOREIGN KEY ("municipioOrigenId") REFERENCES "MunicipioOrigen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteDespacho" ADD CONSTRAINT "LoteDespacho_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "Remitente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteDespacho" ADD CONSTRAINT "LoteDespacho_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteDespacho" ADD CONSTRAINT "LoteDespacho_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "Chofer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteDespacho" ADD CONSTRAINT "LoteDespacho_tipoMineralId_fkey" FOREIGN KEY ("tipoMineralId") REFERENCES "TipoMineral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteDespacho" ADD CONSTRAINT "LoteDespacho_destinoIngenioId_fkey" FOREIGN KEY ("destinoIngenioId") REFERENCES "Ingenio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteDespacho" ADD CONSTRAINT "LoteDespacho_usuarioRegistroId_fkey" FOREIGN KEY ("usuarioRegistroId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConocimientoCarga" ADD CONSTRAINT "ConocimientoCarga_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteDespacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PesajeIngenio" ADD CONSTRAINT "PesajeIngenio_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteDespacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PesajeIngenio" ADD CONSTRAINT "PesajeIngenio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionLote" ADD CONSTRAINT "AnulacionLote_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteDespacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnulacionLote" ADD CONSTRAINT "AnulacionLote_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
