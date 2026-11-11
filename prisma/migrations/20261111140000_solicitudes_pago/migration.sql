-- Módulo "Pagos": solicitudes de pago (formulario que se envía a presidencia).
--
-- Tablas nuevas: SolicitudPago, SolicitudPagoItem y SolicitudPagoFirma. Solo agrega,
-- no modifica ni borra nada existente (en Proveedor y Compra solo se agrega la relación
-- inversa en el esquema, sin columnas nuevas).
--
-- Permisos iniciales (se pueden cambiar en Sistema → Roles y permisos). ADMIN tiene
-- acceso total por código y no necesita filas:
--   ASISTENTE_ADMINISTRATIVO -> ver, crear, editar, pagar, anular (lleva el registro)
--   CONTADOR                 -> ver, revisar        (firma "Revisado por")
--   SUPERINTENDENTE          -> ver, visto_bueno    (firma "VºBº")
--   ADMINISTRADOR            -> ver, autorizar      (firma de Administración)

-- CreateEnum
CREATE TYPE "EstadoSolicitudPago" AS ENUM ('BORRADOR', 'SOLICITADA', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoEntregaSolicitud" AS ENUM ('PENDIENTE', 'EN_EJECUCION', 'COMPLETADO');

-- CreateEnum
CREATE TYPE "TipoFirmaSolicitud" AS ENUM ('ELABORADO', 'REVISADO', 'VISTO_BUENO', 'ADMINISTRADOR');

-- CreateTable
CREATE TABLE "SolicitudPago" (
    "id" TEXT NOT NULL,
    "empresa" TEXT NOT NULL DEFAULT 'MARTE',
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "solicitadoPor" TEXT NOT NULL DEFAULT '',
    "cotizacion" TEXT,
    "informeUso" TEXT,
    "observaciones" TEXT,
    "total" DECIMAL(14,2) NOT NULL,
    "proveedorId" INTEGER,
    "compraId" TEXT,
    "beneficiarioNombre" TEXT NOT NULL,
    "beneficiarioNit" TEXT,
    "banco" TEXT,
    "cuenta" TEXT,
    "estado" "EstadoSolicitudPago" NOT NULL DEFAULT 'BORRADOR',
    "fechaPago" DATE,
    "referenciaPago" TEXT,
    "pagadoPorId" INTEGER,
    "pagadoAt" TIMESTAMP(3),
    "tipoDocumento" "TipoDocumentoCompra",
    "numeroFactura" TEXT,
    "documentoRegistradoAt" TIMESTAMP(3),
    "estadoEntrega" "EstadoEntregaSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "notaEntrega" TEXT,
    "motivoAnulacion" TEXT,
    "anuladoPorId" INTEGER,
    "anuladoAt" TIMESTAMP(3),
    "creadoPorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudPagoItem" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "referencia" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "precioUnit" DECIMAL(14,2) NOT NULL,
    "descuento" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "SolicitudPagoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudPagoFirma" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "tipo" "TipoFirmaSolicitud" NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT '',
    "cargo" TEXT,
    "usuarioId" INTEGER,
    "usuarioNombre" TEXT,
    "firmadoAt" TIMESTAMP(3),

    CONSTRAINT "SolicitudPagoFirma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitudPago_empresa_anio_mes_idx" ON "SolicitudPago"("empresa", "anio", "mes");

-- CreateIndex
CREATE INDEX "SolicitudPago_estado_idx" ON "SolicitudPago"("estado");

-- CreateIndex
CREATE INDEX "SolicitudPago_proveedorId_idx" ON "SolicitudPago"("proveedorId");

-- CreateIndex
CREATE INDEX "SolicitudPago_compraId_idx" ON "SolicitudPago"("compraId");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudPago_empresa_anio_mes_numero_key" ON "SolicitudPago"("empresa", "anio", "mes", "numero");

-- CreateIndex
CREATE INDEX "SolicitudPagoItem_solicitudId_idx" ON "SolicitudPagoItem"("solicitudId");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudPagoFirma_solicitudId_tipo_key" ON "SolicitudPagoFirma"("solicitudId", "tipo");

-- AddForeignKey
ALTER TABLE "SolicitudPago" ADD CONSTRAINT "SolicitudPago_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudPago" ADD CONSTRAINT "SolicitudPago_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudPagoItem" ADD CONSTRAINT "SolicitudPagoItem_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudPago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudPagoFirma" ADD CONSTRAINT "SolicitudPagoFirma_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudPago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sin permisos iniciales: el módulo lo ve solo ADMIN hasta que se asignen desde Sistema → Roles y permisos.
