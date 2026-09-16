-- AlterTable
ALTER TABLE "PartidaPresupuestoCaja" ADD COLUMN     "categoriaRendicion" "CategoriaRendicionGasto",
ADD COLUMN     "centroCostoCajaId" INTEGER,
ADD COLUMN     "cuentaContableCajaId" INTEGER,
ADD COLUMN     "funcionGastoCajaId" INTEGER;

-- AddForeignKey
ALTER TABLE "PartidaPresupuestoCaja" ADD CONSTRAINT "PartidaPresupuestoCaja_centroCostoCajaId_fkey" FOREIGN KEY ("centroCostoCajaId") REFERENCES "CentroCostoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPresupuestoCaja" ADD CONSTRAINT "PartidaPresupuestoCaja_funcionGastoCajaId_fkey" FOREIGN KEY ("funcionGastoCajaId") REFERENCES "FuncionGastoCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPresupuestoCaja" ADD CONSTRAINT "PartidaPresupuestoCaja_cuentaContableCajaId_fkey" FOREIGN KEY ("cuentaContableCajaId") REFERENCES "CuentaContableCaja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
