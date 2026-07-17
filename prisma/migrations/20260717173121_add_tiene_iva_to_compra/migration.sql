-- DropForeignKey
ALTER TABLE "ManifiestoAmbiental" DROP CONSTRAINT "ManifiestoAmbiental_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "RegistroHidrico" DROP CONSTRAINT "RegistroHidrico_puntoId_fkey";

-- DropForeignKey
ALTER TABLE "RegistroHidrico" DROP CONSTRAINT "RegistroHidrico_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "RegistroResiduo" DROP CONSTRAINT "RegistroResiduo_puntoId_fkey";

-- DropForeignKey
ALTER TABLE "RegistroResiduo" DROP CONSTRAINT "RegistroResiduo_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "RegistroRuido" DROP CONSTRAINT "RegistroRuido_puntoId_fkey";

-- DropForeignKey
ALTER TABLE "RegistroRuido" DROP CONSTRAINT "RegistroRuido_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "RegistroSuelo" DROP CONSTRAINT "RegistroSuelo_puntoId_fkey";

-- DropForeignKey
ALTER TABLE "RegistroSuelo" DROP CONSTRAINT "RegistroSuelo_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Compra" ADD COLUMN     "tieneIva" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ManifiestoAmbiental" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PozoSeptico" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PuntoMonitoreo" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SaldoMensual" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "RegistroHidrico" ADD CONSTRAINT "RegistroHidrico_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "PuntoMonitoreo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHidrico" ADD CONSTRAINT "RegistroHidrico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroResiduo" ADD CONSTRAINT "RegistroResiduo_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "PuntoMonitoreo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroResiduo" ADD CONSTRAINT "RegistroResiduo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroRuido" ADD CONSTRAINT "RegistroRuido_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "PuntoMonitoreo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroRuido" ADD CONSTRAINT "RegistroRuido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroSuelo" ADD CONSTRAINT "RegistroSuelo_puntoId_fkey" FOREIGN KEY ("puntoId") REFERENCES "PuntoMonitoreo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroSuelo" ADD CONSTRAINT "RegistroSuelo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifiestoAmbiental" ADD CONSTRAINT "ManifiestoAmbiental_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
