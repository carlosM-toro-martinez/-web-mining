-- CreateTable
CREATE TABLE "Ubicacion" (
    "id" TEXT NOT NULL,
    "nivel" TEXT,
    "sector" TEXT,
    "galeria" TEXT,
    "punto" TEXT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "z" DOUBLE PRECISION,
    "elevacion" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Muestra" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numero" INTEGER,
    "tipo" TEXT,
    "fechaMuestreo" TIMESTAMP(3),
    "fechaEntrega" TIMESTAMP(3),
    "descripcion" TEXT,
    "usuarioId" INTEGER,
    "ubicacionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Muestra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Elemento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT,

    CONSTRAINT "Elemento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resultado" (
    "id" TEXT NOT NULL,
    "muestraId" TEXT NOT NULL,
    "elementoId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atributo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Atributo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MuestraAtributo" (
    "id" TEXT NOT NULL,
    "muestraId" TEXT NOT NULL,
    "atributoId" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "MuestraAtributo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Elemento_nombre_key" ON "Elemento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Resultado_muestraId_elementoId_key" ON "Resultado"("muestraId", "elementoId");

-- CreateIndex
CREATE UNIQUE INDEX "Atributo_nombre_key" ON "Atributo"("nombre");

-- AddForeignKey
ALTER TABLE "Muestra" ADD CONSTRAINT "Muestra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Muestra" ADD CONSTRAINT "Muestra_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_muestraId_fkey" FOREIGN KEY ("muestraId") REFERENCES "Muestra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_elementoId_fkey" FOREIGN KEY ("elementoId") REFERENCES "Elemento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MuestraAtributo" ADD CONSTRAINT "MuestraAtributo_muestraId_fkey" FOREIGN KEY ("muestraId") REFERENCES "Muestra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MuestraAtributo" ADD CONSTRAINT "MuestraAtributo_atributoId_fkey" FOREIGN KEY ("atributoId") REFERENCES "Atributo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
