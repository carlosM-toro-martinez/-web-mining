-- CreateTable
CREATE TABLE "CierreLogisticaMensual" (
    "id" SERIAL NOT NULL,
    "municipioId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CierreLogisticaMensual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CierreLogisticaMensual_municipioId_anio_mes_key" ON "CierreLogisticaMensual"("municipioId", "anio", "mes");
