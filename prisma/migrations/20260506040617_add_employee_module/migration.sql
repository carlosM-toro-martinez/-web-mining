-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "deviceUserId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncQueue" (
    "id" SERIAL NOT NULL,
    "action" "SyncAction" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "deviceIp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsistenciaLog" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER,
    "deviceUserId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "AsistenciaLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_documento_key" ON "Employee"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_deviceUserId_key" ON "Employee"("deviceUserId");

-- AddForeignKey
ALTER TABLE "AsistenciaLog" ADD CONSTRAINT "AsistenciaLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
