import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type { CierreMensualDTO, CuadroMensualQuery } from "./logisticaReportes.types.js";

function rangoMes(anio: number, mes: number) {
  const inicio = new Date(Date.UTC(anio, mes - 1, 1));
  const fin = new Date(Date.UTC(anio, mes, 1));
  return { inicio, fin };
}

export const logisticaReportesService = {
  // Cuadro mensual: consolida los lotes del municipio en el mes (por
  // fecha_documental_fiscal, no por fecha_despacho_real) para declarar
  // Formulario 101 + Conocimientos de Carga ante el gobierno municipal.
  async getCuadroMensual(query: CuadroMensualQuery) {
    const { inicio, fin } = rangoMes(query.anio, query.mes);

    const lotes = await prisma.loteDespacho.findMany({
      where: {
        municipioOrigenId: query.municipioId,
        fechaDocumentalFiscal: { gte: inicio, lt: fin },
        estadoLote: { not: "ANULADO" },
      },
      include: {
        remitente: true,
        tipoMineral: true,
        destinoIngenio: true,
        pesaje: true,
        conocimientoCarga: true,
      },
      orderBy: { fechaDocumentalFiscal: "asc" },
    });

    const cierre = await prisma.cierreLogisticaMensual.findUnique({
      where: {
        municipioId_anio_mes: { municipioId: query.municipioId, anio: query.anio, mes: query.mes },
      },
    });

    const totalTonelajeNeto = lotes.reduce((acc, l) => acc + Number(l.pesaje?.tonelajeNeto ?? 0), 0);
    const pendientesF101 = lotes.filter((l) => l.estadoFormulario101 === "PENDIENTE").length;

    return {
      lotes,
      resumen: { totalLotes: lotes.length, totalTonelajeNeto, pendientesF101 },
      cerrado: Boolean(cierre),
      cierre,
    };
  },

  // Bloquea el cierre si queda algún F101 pendiente de regularizar en el
  // mes — evita declarar el cuadro municipal con documentación incompleta.
  async cerrarMes(data: CierreMensualDTO, userId: number) {
    const { inicio, fin } = rangoMes(data.anio, data.mes);

    const pendientes = await prisma.loteDespacho.count({
      where: {
        municipioOrigenId: data.municipioId,
        fechaDocumentalFiscal: { gte: inicio, lt: fin },
        estadoLote: { not: "ANULADO" },
        estadoFormulario101: "PENDIENTE",
      },
    });

    if (pendientes > 0) {
      throw new HttpError(
        `No se puede cerrar el mes: hay ${pendientes} lote(s) con Formulario 101 pendiente de regularizar`,
        409,
      );
    }

    const existente = await prisma.cierreLogisticaMensual.findUnique({
      where: {
        municipioId_anio_mes: { municipioId: data.municipioId, anio: data.anio, mes: data.mes },
      },
    });
    if (existente) {
      throw new HttpError("Este municipio y mes ya fueron cerrados", 409);
    }

    const cierre = await prisma.cierreLogisticaMensual.create({
      data: { municipioId: data.municipioId, anio: data.anio, mes: data.mes, usuarioId: userId },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CERRAR_MES_LOGISTICA",
        data: { municipioId: data.municipioId, anio: data.anio, mes: data.mes },
      },
    });

    logger.info(
      { userId, municipioId: data.municipioId, anio: data.anio, mes: data.mes, action: "CERRAR_MES_LOGISTICA" },
      "Mes de logística cerrado",
    );

    return cierre;
  },

  async getCierres(municipioId?: number) {
    return prisma.cierreLogisticaMensual.findMany({
      where: municipioId ? { municipioId } : {},
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
    });
  },
};
