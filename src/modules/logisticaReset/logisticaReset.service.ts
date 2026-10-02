import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";

// Borra TODOS los datos de PRUEBA del módulo de Logística (catálogos,
// flota, lotes, formularios 101, liquidaciones y tarifas) para poder
// probar el módulo desde cero en desarrollo. Nunca toca Caja Chica,
// Inventario, Ambiental, EPP ni usuarios. Orden respeta las FKs: hijos
// antes que padres.
//
// Excepción: todo lo marcado esSemilla=true (transportistas/vehículos/
// choferes de la flota real, municipios/tipo de mineral/ingenio y tarifas
// fijas de seedLogistica.ts, transcritos de documentos reales) NUNCA se
// borra aquí — es el maestro real de la operación, no datos de prueba.
// Solo se elimina lo que el usuario creó a mano para probar.
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
      await tx.estadoFlotaHistorico.deleteMany({ where: { vehiculo: { esSemilla: false } } });
      const vehiculos = await tx.vehiculo.deleteMany({ where: { esSemilla: false } });
      const choferes = await tx.chofer.deleteMany({ where: { esSemilla: false } });
      const tarifas = await tx.tarifaLiquidacion.deleteMany({ where: { esSemilla: false } });
      await tx.alicuotaRegalia.deleteMany({});
      const transportistas = await tx.transportista.deleteMany({ where: { esSemilla: false } });
      await tx.cierreLogisticaMensual.deleteMany({});
      await tx.conceptoLiquidacion.deleteMany({});
      const municipios = await tx.municipioOrigen.deleteMany({ where: { esSemilla: false } });
      const tiposMineral = await tx.tipoMineral.deleteMany({ where: { esSemilla: false } });
      const ingenios = await tx.ingenio.deleteMany({ where: { esSemilla: false } });
      await tx.correlativoContador.deleteMany({ where: { clave: { startsWith: "LOTE_DESPACHO_" } } });

      const resumen = {
        lotes: lotes.count,
        liquidaciones: liquidaciones.count,
        vehiculos: vehiculos.count,
        choferes: choferes.count,
        tarifas: tarifas.count,
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
