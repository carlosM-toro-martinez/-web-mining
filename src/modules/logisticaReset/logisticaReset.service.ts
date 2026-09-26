import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";

// Borra TODOS los datos del módulo de Logística (catálogos, flota, lotes,
// formularios 101 y liquidaciones) para poder probar el módulo desde cero
// en desarrollo. Nunca toca Caja Chica, Inventario, Ambiental, EPP ni
// usuarios. Orden respeta las FKs: hijos antes que padres.
export const logisticaResetService = {
  async resetTodo(userId: number) {
    const resultado = await prisma.$transaction(async (tx) => {
      await tx.anulacionFormulario101.deleteMany({});
      await tx.formulario101.deleteMany({});
      await tx.pesajeIngenio.deleteMany({});
      await tx.anulacionLote.deleteMany({});
      await tx.transbordoLote.deleteMany({});
      await tx.conocimientoCarga.deleteMany({});
      await tx.anulacionLiquidacion.deleteMany({});
      await tx.liquidacionItemConcepto.deleteMany({});
      await tx.liquidacionDetalleLote.deleteMany({});
      const liquidaciones = await tx.liquidacionPeriodo.deleteMany({});
      const lotes = await tx.loteDespacho.deleteMany({});
      await tx.estadoFlotaHistorico.deleteMany({});
      const vehiculos = await tx.vehiculo.deleteMany({});
      const choferes = await tx.chofer.deleteMany({});
      await tx.tarifaLiquidacion.deleteMany({});
      await tx.alicuotaRegalia.deleteMany({});
      const transportistas = await tx.transportista.deleteMany({});
      await tx.cierreLogisticaMensual.deleteMany({});
      await tx.conceptoLiquidacion.deleteMany({});
      const municipios = await tx.municipioOrigen.deleteMany({});
      const tiposMineral = await tx.tipoMineral.deleteMany({});
      const ingenios = await tx.ingenio.deleteMany({});
      await tx.correlativoContador.deleteMany({ where: { clave: { startsWith: "LOTE_DESPACHO_" } } });

      const resumen = {
        lotes: lotes.count,
        liquidaciones: liquidaciones.count,
        vehiculos: vehiculos.count,
        choferes: choferes.count,
        transportistas: transportistas.count,
        municipios: municipios.count,
        tiposMineral: tiposMineral.count,
        ingenios: ingenios.count,
      };

      await tx.log.create({
        data: { usuarioId: userId, accion: "RESET_LOGISTICA_TOTAL", data: resumen },
      });

      return resumen;
    });

    logger.warn({ userId, action: "RESET_LOGISTICA_TOTAL", ...resultado }, "Se eliminaron TODOS los datos del módulo de Logística");

    return resultado;
  },
};
