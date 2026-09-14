-- CreateEnum
CREATE TYPE "MonedaCaja" AS ENUM ('BOB', 'USD');

-- CreateEnum
CREATE TYPE "TipoCosteoCaja" AS ENUM ('DISTRIBUIBLE', 'NO_DISTRIBUIBLE');

-- CreateEnum
CREATE TYPE "ClaseCuentaCaja" AS ENUM ('BAL', 'IND', 'MAY');

-- CreateEnum
CREATE TYPE "TipoRetencionCaja" AS ENUM ('RC_IVA', 'IUE_SERVICIOS', 'IUE_COMPRAS', 'IT');

-- CreateTable
CREATE TABLE "CajaChica" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "monedaBase" "MonedaCaja" NOT NULL DEFAULT 'BOB',
    "encargadoNombre" TEXT,
    "encargadoUsuarioId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CajaChica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroCostoCaja" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCosteoCaja" NOT NULL,
    "parentId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CentroCostoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuncionGastoCaja" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCosteoCaja" NOT NULL,
    "parentId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FuncionGastoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaContableCaja" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "clase" "ClaseCuentaCaja" NOT NULL,
    "nivel" INTEGER NOT NULL,
    "monedaCodigo" TEXT NOT NULL,
    "requiereCentroCosto" BOOLEAN NOT NULL DEFAULT false,
    "requiereFuncionGasto" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CuentaContableCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptoRetencionCaja" (
    "id" SERIAL NOT NULL,
    "codigo" "TipoRetencionCaja" NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "cuentaContableCajaId" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConceptoRetencionCaja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CajaChica_codigo_key" ON "CajaChica"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CentroCostoCaja_codigo_key" ON "CentroCostoCaja"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "FuncionGastoCaja_codigo_key" ON "FuncionGastoCaja"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaContableCaja_codigo_key" ON "CuentaContableCaja"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptoRetencionCaja_codigo_key" ON "ConceptoRetencionCaja"("codigo");

-- AddForeignKey
ALTER TABLE "CajaChica" ADD CONSTRAINT "CajaChica_encargadoUsuarioId_fkey" FOREIGN KEY ("encargadoUsuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentroCostoCaja" ADD CONSTRAINT "CentroCostoCaja_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CentroCostoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncionGastoCaja" ADD CONSTRAINT "FuncionGastoCaja_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FuncionGastoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptoRetencionCaja" ADD CONSTRAINT "ConceptoRetencionCaja_cuentaContableCajaId_fkey" FOREIGN KEY ("cuentaContableCajaId") REFERENCES "CuentaContableCaja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
