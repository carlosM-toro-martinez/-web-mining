-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AusenciaTipo" AS ENUM ('VACACION', 'DESCANSO', 'PERMISO', 'ENFERMEDAD', 'FERIADO', 'ABANDONO', 'OTRO');

-- CreateEnum
CREATE TYPE "public"."CalidadAgua" AS ENUM ('EXCELENTE', 'BUENA', 'REGULAR', 'MALA', 'CRITICA');

-- CreateEnum
CREATE TYPE "public"."CondicionEpp" AS ENUM ('NUEVO', 'EN_USO', 'DEVUELTO_BUENO', 'DEVUELTO_USADO', 'BAJA');

-- CreateEnum
CREATE TYPE "public"."EstadoCompra" AS ENUM ('PENDIENTE', 'PARCIAL', 'COMPLETADO', 'ANULADA');

-- CreateEnum
CREATE TYPE "public"."EstadoInfraestructura" AS ENUM ('BUENO', 'REGULAR', 'MALO', 'CRITICO');

-- CreateEnum
CREATE TYPE "public"."EstadoPedido" AS ENUM ('PENDIENTE', 'PARCIAL', 'COMPLETADO');

-- CreateEnum
CREATE TYPE "public"."EstadoVale" AS ENUM ('PENDIENTE', 'APROBADO', 'PARCIAL', 'COMPLETADO', 'RECHAZADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "public"."MetodoCosteo" AS ENUM ('ULTIMO_PRECIO', 'PROMEDIO_PONDERADO');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'ALMACENERO', 'SUPERINTENDENTE', 'TRABAJADOR', 'VISITANTE', 'GEOLOGOADMIN', 'GEOLOGO', 'ADMINISTRADOR', 'MEDIOAMBIENTE', 'SEGURIDAD');

-- CreateEnum
CREATE TYPE "public"."SyncAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "public"."SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA');

-- CreateEnum
CREATE TYPE "public"."TipoPersonal" AS ENUM ('OBRERO', 'TECNICO_EMPLEADO');

-- CreateEnum
CREATE TYPE "public"."TipoPunto" AS ENUM ('HIDRICO', 'SUELO', 'RUIDO', 'RESIDUOS', 'POZO_SEPTICO', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."TipoResiduo" AS ENUM ('SOLIDO_PELIGROSO', 'SOLIDO_NO_PELIGROSO', 'LIQUIDO_PELIGROSO', 'LIQUIDO_NO_PELIGROSO');

-- CreateTable
CREATE TABLE "public"."AnulacionCompra" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnulacionCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnulacionVale" (
    "id" TEXT NOT NULL,
    "valeId" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnulacionVale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AsistenciaLog" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER,
    "deviceUserId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "AsistenciaLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AusenciaEmpleado" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "tipo" "public"."AusenciaTipo" NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "creadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AusenciaEmpleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CategoriaInventario" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "parentId" INTEGER,

    CONSTRAINT "CategoriaInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CentroCosto" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "CentroCosto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CierreMes" (
    "id" SERIAL NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CierreMes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Compra" (
    "id" TEXT NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "estado" "public"."EstadoCompra" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,
    "recibidoAt" TIMESTAMP(3),
    "usuarioRecibidoId" INTEGER,
    "usuarioRegistroId" INTEGER NOT NULL,
    "numeroFactura" TEXT,
    "descuento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "fechaOperacion" TIMESTAMP(3),

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompraItem" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidadPedida" DECIMAL(12,2) NOT NULL,
    "cantidadRecibida" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "precioUnit" DECIMAL(14,6) NOT NULL,

    CONSTRAINT "CompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Configuracion" (
    "id" SERIAL NOT NULL,
    "metodoCosteo" "public"."MetodoCosteo" NOT NULL DEFAULT 'ULTIMO_PRECIO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CuentaContable" (
    "id" SERIAL NOT NULL,
    "codigoCompleto" TEXT NOT NULL,
    "centroCostoId" INTEGER NOT NULL,
    "funcionGastoId" INTEGER NOT NULL,
    "sectorId" INTEGER,

    CONSTRAINT "CuentaContable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeviceState" (
    "sn" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceState_pkey" PRIMARY KEY ("sn")
);

-- CreateTable
CREATE TABLE "public"."EmpleadoHorario" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "horarioId" INTEGER NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpleadoHorario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "deviceUserId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncStatus" "public"."SyncStatus" NOT NULL DEFAULT 'PENDING',
    "cargo" TEXT,
    "tipoPersonal" "public"."TipoPersonal" NOT NULL DEFAULT 'OBRERO',

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EppAsignacion" (
    "id" TEXT NOT NULL,
    "productoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDevolucion" TIMESTAMP(3),
    "condicion" "public"."CondicionEpp" NOT NULL DEFAULT 'EN_USO',
    "observacion" TEXT,

    CONSTRAINT "EppAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FuncionGasto" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "FuncionGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Horario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "horaEntrada" TEXT NOT NULL,
    "horaSalida" TEXT NOT NULL,
    "tolerancia" INTEGER NOT NULL DEFAULT 15,
    "lunes" BOOLEAN NOT NULL DEFAULT true,
    "martes" BOOLEAN NOT NULL DEFAULT true,
    "miercoles" BOOLEAN NOT NULL DEFAULT true,
    "jueves" BOOLEAN NOT NULL DEFAULT true,
    "viernes" BOOLEAN NOT NULL DEFAULT true,
    "sabado" BOOLEAN NOT NULL DEFAULT false,
    "domingo" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Log" (
    "id" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "accion" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ManifiestoAmbiental" (
    "id" SERIAL NOT NULL,
    "anio" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "objetivos" TEXT,
    "compromisos" TEXT,
    "responsable" TEXT,
    "aprobadoAt" TIMESTAMP(3),
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManifiestoAmbiental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Movimiento" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "productoId" INTEGER NOT NULL,
    "tipo" "public"."TipoMovimiento" NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "precioUnit" DECIMAL(14,6) NOT NULL,
    "entradaBs" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salidaBs" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoBs" DECIMAL(12,2) NOT NULL,
    "stockAntes" DECIMAL(12,2) NOT NULL,
    "stockDespues" DECIMAL(12,2) NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "cuentaId" INTEGER,
    "referencia" TEXT,
    "referenciaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioEntregaId" INTEGER,
    "usuarioRecibidoId" INTEGER,
    "esRetroactivo" BOOLEAN NOT NULL DEFAULT false,
    "periodoAnio" INTEGER,
    "periodoMes" INTEGER,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pedido" (
    "id" TEXT NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "estado" "public"."EstadoPedido" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PedidoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidadPedida" DECIMAL(12,2) NOT NULL,
    "cantidadRecibida" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PozoSeptico" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "capacidadM3" DOUBLE PRECISION,
    "estado" "public"."EstadoInfraestructura" NOT NULL DEFAULT 'BUENO',
    "ultimaLimpieza" TIMESTAMP(3),
    "proximaLimpieza" TIMESTAMP(3),
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PozoSeptico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Producto" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "esEpp" BOOLEAN NOT NULL DEFAULT false,
    "cuentaId" INTEGER,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Proveedor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "lugar" TEXT,
    "nit" TEXT,
    "razonSocial" TEXT,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PuntoMonitoreo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "tipo" "public"."TipoPunto" NOT NULL DEFAULT 'GENERAL',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuntoMonitoreo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegistroHidrico" (
    "id" SERIAL NOT NULL,
    "puntoId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "ph" DOUBLE PRECISION,
    "turbidez" DOUBLE PRECISION,
    "conductividad" DOUBLE PRECISION,
    "oxigenoDisuelto" DOUBLE PRECISION,
    "temperatura" DOUBLE PRECISION,
    "coliformesFecales" DOUBLE PRECISION,
    "calidadAgua" "public"."CalidadAgua" NOT NULL DEFAULT 'BUENA',
    "observaciones" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroHidrico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegistroResiduo" (
    "id" SERIAL NOT NULL,
    "puntoId" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipoResiduo" "public"."TipoResiduo" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidad" TEXT NOT NULL,
    "disposicion" TEXT NOT NULL,
    "empresa" TEXT,
    "manifiestoNum" TEXT,
    "observaciones" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroResiduo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegistroRuido" (
    "id" SERIAL NOT NULL,
    "puntoId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "nivelRuido" DOUBLE PRECISION NOT NULL,
    "limitePermitido" DOUBLE PRECISION,
    "particulasPm10" DOUBLE PRECISION,
    "particulasPm25" DOUBLE PRECISION,
    "observaciones" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroRuido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegistroSuelo" (
    "id" SERIAL NOT NULL,
    "puntoId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "ph" DOUBLE PRECISION,
    "conductividad" DOUBLE PRECISION,
    "materiaOrganica" DOUBLE PRECISION,
    "especiesRegistradas" TEXT,
    "observaciones" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroSuelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SaldoMensual" (
    "id" TEXT NOT NULL,
    "productoId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "saldoInicial" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "ingresoQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "salidaQty" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "saldoFinal" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "precioUnit" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "totalBs" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingresosBs" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "precioUnitProm" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "totalBsProm" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "totalBsInicial" DECIMAL(14,2),

    CONSTRAINT "SaldoMensual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sector" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Stock" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "precioUnit" DECIMAL(14,6) NOT NULL,
    "precioProm" DECIMAL(14,6) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cantidadReservada" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncQueue" (
    "id" SERIAL NOT NULL,
    "action" "public"."SyncAction" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "public"."SyncStatus" NOT NULL DEFAULT 'PENDING',
    "deviceIp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "refreshToken" TEXT,
    "refreshTokenExpiry" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vale" (
    "id" TEXT NOT NULL,
    "solicitanteId" INTEGER NOT NULL,
    "superintendenteId" INTEGER,
    "estado" "public"."EstadoVale" NOT NULL,
    "aprobadoAt" TIMESTAMP(3),
    "entregadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "almaceneroId" INTEGER,
    "fechaOperacion" TIMESTAMP(3),

    CONSTRAINT "Vale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ValeItem" (
    "id" TEXT NOT NULL,
    "valeId" TEXT NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidadSolicitada" DECIMAL(12,2) NOT NULL,
    "cantidadEntregada" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ValeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnulacionCompra_compraId_key" ON "public"."AnulacionCompra"("compraId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AnulacionVale_valeId_key" ON "public"."AnulacionVale"("valeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AsistenciaLog_deviceUserId_fecha_key" ON "public"."AsistenciaLog"("deviceUserId" ASC, "fecha" ASC);

-- CreateIndex
CREATE INDEX "AsistenciaLog_employeeId_idx" ON "public"."AsistenciaLog"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "AsistenciaLog_fecha_idx" ON "public"."AsistenciaLog"("fecha" ASC);

-- CreateIndex
CREATE INDEX "AusenciaEmpleado_desde_hasta_idx" ON "public"."AusenciaEmpleado"("desde" ASC, "hasta" ASC);

-- CreateIndex
CREATE INDEX "AusenciaEmpleado_employeeId_idx" ON "public"."AusenciaEmpleado"("employeeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CentroCosto_codigo_key" ON "public"."CentroCosto"("codigo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CierreMes_anio_mes_key" ON "public"."CierreMes"("anio" ASC, "mes" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CuentaContable_codigoCompleto_key" ON "public"."CuentaContable"("codigoCompleto" ASC);

-- CreateIndex
CREATE INDEX "EmpleadoHorario_employeeId_idx" ON "public"."EmpleadoHorario"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "EmpleadoHorario_horarioId_idx" ON "public"."EmpleadoHorario"("horarioId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_deviceUserId_key" ON "public"."Employee"("deviceUserId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_documento_key" ON "public"."Employee"("documento" ASC);

-- CreateIndex
CREATE INDEX "EppAsignacion_productoId_idx" ON "public"."EppAsignacion"("productoId" ASC);

-- CreateIndex
CREATE INDEX "EppAsignacion_usuarioId_idx" ON "public"."EppAsignacion"("usuarioId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FuncionGasto_codigo_key" ON "public"."FuncionGasto"("codigo" ASC);

-- CreateIndex
CREATE INDEX "ManifiestoAmbiental_anio_idx" ON "public"."ManifiestoAmbiental"("anio" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Movimiento_operationId_key" ON "public"."Movimiento"("operationId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigo_key" ON "public"."Producto"("codigo" ASC);

-- CreateIndex
CREATE INDEX "PuntoMonitoreo_tipo_idx" ON "public"."PuntoMonitoreo"("tipo" ASC);

-- CreateIndex
CREATE INDEX "RegistroHidrico_fecha_idx" ON "public"."RegistroHidrico"("fecha" ASC);

-- CreateIndex
CREATE INDEX "RegistroHidrico_puntoId_idx" ON "public"."RegistroHidrico"("puntoId" ASC);

-- CreateIndex
CREATE INDEX "RegistroResiduo_fecha_idx" ON "public"."RegistroResiduo"("fecha" ASC);

-- CreateIndex
CREATE INDEX "RegistroResiduo_puntoId_idx" ON "public"."RegistroResiduo"("puntoId" ASC);

-- CreateIndex
CREATE INDEX "RegistroRuido_fecha_idx" ON "public"."RegistroRuido"("fecha" ASC);

-- CreateIndex
CREATE INDEX "RegistroRuido_puntoId_idx" ON "public"."RegistroRuido"("puntoId" ASC);

-- CreateIndex
CREATE INDEX "RegistroSuelo_fecha_idx" ON "public"."RegistroSuelo"("fecha" ASC);

-- CreateIndex
CREATE INDEX "RegistroSuelo_puntoId_idx" ON "public"."RegistroSuelo"("puntoId" ASC);

-- CreateIndex
CREATE INDEX "SaldoMensual_anio_mes_idx" ON "public"."SaldoMensual"("anio" ASC, "mes" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SaldoMensual_productoId_anio_mes_key" ON "public"."SaldoMensual"("productoId" ASC, "anio" ASC, "mes" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Sector_codigo_key" ON "public"."Sector"("codigo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_productoId_key" ON "public"."Stock"("productoId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."AnulacionCompra" ADD CONSTRAINT "AnulacionCompra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "public"."Compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnulacionCompra" ADD CONSTRAINT "AnulacionCompra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnulacionVale" ADD CONSTRAINT "AnulacionVale_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnulacionVale" ADD CONSTRAINT "AnulacionVale_valeId_fkey" FOREIGN KEY ("valeId") REFERENCES "public"."Vale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AsistenciaLog" ADD CONSTRAINT "AsistenciaLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AusenciaEmpleado" ADD CONSTRAINT "AusenciaEmpleado_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategoriaInventario" ADD CONSTRAINT "CategoriaInventario_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."CategoriaInventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Compra" ADD CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "public"."Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Compra" ADD CONSTRAINT "Compra_usuarioRecibidoId_fkey" FOREIGN KEY ("usuarioRecibidoId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Compra" ADD CONSTRAINT "Compra_usuarioRegistroId_fkey" FOREIGN KEY ("usuarioRegistroId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompraItem" ADD CONSTRAINT "CompraItem_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "public"."Compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompraItem" ADD CONSTRAINT "CompraItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CuentaContable" ADD CONSTRAINT "CuentaContable_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "public"."CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CuentaContable" ADD CONSTRAINT "CuentaContable_funcionGastoId_fkey" FOREIGN KEY ("funcionGastoId") REFERENCES "public"."FuncionGasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CuentaContable" ADD CONSTRAINT "CuentaContable_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "public"."Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmpleadoHorario" ADD CONSTRAINT "EmpleadoHorario_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmpleadoHorario" ADD CONSTRAINT "EmpleadoHorario_horarioId_fkey" FOREIGN KEY ("horarioId") REFERENCES "public"."Horario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EppAsignacion" ADD CONSTRAINT "EppAsignacion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EppAsignacion" ADD CONSTRAINT "EppAsignacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Log" ADD CONSTRAINT "Log_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ManifiestoAmbiental" ADD CONSTRAINT "ManifiestoAmbiental_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Movimiento" ADD CONSTRAINT "Movimiento_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "public"."CuentaContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Movimiento" ADD CONSTRAINT "Movimiento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Movimiento" ADD CONSTRAINT "Movimiento_usuarioEntregaId_fkey" FOREIGN KEY ("usuarioEntregaId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Movimiento" ADD CONSTRAINT "Movimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Movimiento" ADD CONSTRAINT "Movimiento_usuarioRecibidoId_fkey" FOREIGN KEY ("usuarioRecibidoId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedido" ADD CONSTRAINT "Pedido_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "public"."Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoItem" ADD CONSTRAINT "PedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "public"."CategoriaInventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "public"."CuentaContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroHidrico" ADD CONSTRAINT "RegistroHidrico_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "public"."PuntoMonitoreo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."RegistroHidrico" ADD CONSTRAINT "RegistroHidrico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."RegistroResiduo" ADD CONSTRAINT "RegistroResiduo_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "public"."PuntoMonitoreo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."RegistroResiduo" ADD CONSTRAINT "RegistroResiduo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."RegistroRuido" ADD CONSTRAINT "RegistroRuido_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "public"."PuntoMonitoreo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."RegistroRuido" ADD CONSTRAINT "RegistroRuido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."RegistroSuelo" ADD CONSTRAINT "RegistroSuelo_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "public"."PuntoMonitoreo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."RegistroSuelo" ADD CONSTRAINT "RegistroSuelo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."SaldoMensual" ADD CONSTRAINT "SaldoMensual_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stock" ADD CONSTRAINT "Stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vale" ADD CONSTRAINT "Vale_almaceneroId_fkey" FOREIGN KEY ("almaceneroId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vale" ADD CONSTRAINT "Vale_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vale" ADD CONSTRAINT "Vale_superintendenteId_fkey" FOREIGN KEY ("superintendenteId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValeItem" ADD CONSTRAINT "ValeItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValeItem" ADD CONSTRAINT "ValeItem_valeId_fkey" FOREIGN KEY ("valeId") REFERENCES "public"."Vale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

