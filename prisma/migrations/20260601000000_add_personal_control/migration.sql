-- CreateEnum
CREATE TYPE "AusenciaTipo" AS ENUM ('VACACION', 'DESCANSO', 'PERMISO', 'ENFERMEDAD', 'FERIADO', 'ABANDONO', 'OTRO');

-- CreateTable
CREATE TABLE "Horario" (
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
CREATE TABLE "EmpleadoHorario" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "horarioId" INTEGER NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpleadoHorario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AusenciaEmpleado" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "tipo" "AusenciaTipo" NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "creadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AusenciaEmpleado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmpleadoHorario_employeeId_idx" ON "EmpleadoHorario"("employeeId");

-- CreateIndex
CREATE INDEX "EmpleadoHorario_horarioId_idx" ON "EmpleadoHorario"("horarioId");

-- CreateIndex
CREATE INDEX "AusenciaEmpleado_employeeId_idx" ON "AusenciaEmpleado"("employeeId");

-- CreateIndex
CREATE INDEX "AusenciaEmpleado_desde_hasta_idx" ON "AusenciaEmpleado"("desde", "hasta");

-- AddForeignKey
ALTER TABLE "EmpleadoHorario" ADD CONSTRAINT "EmpleadoHorario_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpleadoHorario" ADD CONSTRAINT "EmpleadoHorario_horarioId_fkey" FOREIGN KEY ("horarioId") REFERENCES "Horario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AusenciaEmpleado" ADD CONSTRAINT "AusenciaEmpleado_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
