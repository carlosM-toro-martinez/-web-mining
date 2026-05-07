-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "cuentaId" INTEGER;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "CuentaContable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
