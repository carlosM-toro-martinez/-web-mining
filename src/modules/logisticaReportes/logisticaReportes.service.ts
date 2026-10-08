import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type { CierreMensualDTO, CuadroMensualQuery } from "./logisticaReportes.types.js";

function rangoMes(anio: number, mes: number) {
  const inicio = new Date(Date.UTC(anio, mes - 1, 1));
  const fin = new Date(Date.UTC(anio, mes, 1));
  return { inicio, fin };
}

// Extrae el número entero que precede al "/" en un correlativo ("27/10" → 27).
// Lotes anulados tienen sufijo " ANULADO" y devuelven el mismo número.
function numeroDeLote(correlativo: string): number {
  return parseInt(correlativo.split("/")[0] ?? "", 10) || 0;
}

export const logisticaReportesService = {
  // Cuadro mensual: consolida los lotes del municipio en el mes (por
  // fecha_documental_fiscal, no por fecha_despacho_real) para declarar
  // Formulario 101 + Conocimientos de Carga ante el gobierno municipal.
  async getCuadroMensual(query: CuadroMensualQuery) {
    const { inicio, fin } = rangoMes(query.anio, query.mes);

    const lotes = await prisma.loteDespacho.findMany({
      where: {
        ...(query.municipioId ? { municipioOrigenId: query.municipioId } : {}),
        ...(query.nivel ? { nivel: query.nivel } : {}),
        fechaDocumentalFiscal: { gte: inicio, lt: fin },
        estadoLote: { not: "ANULADO" },
      },
      include: {
        transportista: true,
        vehiculo: true,
        chofer: true,
        tipoMineral: true,
        municipioOrigen: true,
        destinoIngenio: true,
        pesaje: true,
        conocimientoCarga: true,
        formulario101: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // El cuadro impreso del Conocimiento de Carga se entrega en orden de
    // número de lote (no de fecha), así que se ordena antes de devolverlo.
    lotes.sort((a, b) => numeroDeLote(a.correlativo) - numeroDeLote(b.correlativo));

    // El cierre mensual es por municipio — en modo "todos los municipios"
    // no hay un único registro que lo represente, así que se omite (no
    // bloquea la vista/exportación del consolidado, solo "Cerrar mes").
    const cierre = query.municipioId
      ? await prisma.cierreLogisticaMensual.findUnique({
          where: {
            municipioId_anio_mes: { municipioId: query.municipioId, anio: query.anio, mes: query.mes },
          },
        })
      : null;

    const totalTonelajeNeto = lotes.reduce((acc, l) => acc + Number(l.pesaje?.tonelajeNeto ?? 0), 0);
    const pendientesF101 = lotes.filter((l) => !l.formulario101).length;

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
        formulario101: null,
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

  // Verifica que la serie de conocimientos y la de F101 estén completas y en
  // orden. Incluye los lotes ANULADO para que se vea el historial completo.
  async getIntegridadCorrelativo(query: CuadroMensualQuery) {
    const { inicio, fin } = rangoMes(query.anio, query.mes);
    const mes = query.mes;

    const lotes = await prisma.loteDespacho.findMany({
      where: {
        ...(query.municipioId ? { municipioOrigenId: query.municipioId } : {}),
        ...(query.nivel ? { nivel: query.nivel } : {}),
        fechaDocumentalFiscal: { gte: inicio, lt: fin },
      },
      include: { transportista: true, formulario101: true },
      orderBy: { createdAt: "asc" },
    });

    // Patrón que reconoce lotes activos: "N/MM" exacto (sin sufijo ANULADO).
    const patronActivo = new RegExp(`^(\\d+)/0?${mes}$`);

    const lotesConNumero = lotes.map((l) => {
      const m = patronActivo.exec(l.correlativo);
      return { ...l, numero: m ? parseInt(m[1]!, 10) : null };
    });

    // Ordena por número; los que no tienen número (no deberían existir) van al final.
    lotesConNumero.sort((a, b) => {
      if (a.numero === null) return 1;
      if (b.numero === null) return -1;
      return a.numero - b.numero;
    });

    // Huecos en la serie activa (números 1..max que no tienen lote activo).
    const numerosActivos = lotesConNumero.filter((l) => l.numero !== null).map((l) => l.numero!);
    const maxActivo = numerosActivos.length > 0 ? Math.max(...numerosActivos) : 0;
    const setActivos = new Set(numerosActivos);
    const huecosCorrelativo: number[] = [];
    for (let i = 1; i <= maxActivo; i++) {
      if (!setActivos.has(i)) huecosCorrelativo.push(i);
    }

    // Análisis de F101: solo lotes activos que ya tienen código asignado.
    const activosConF101 = lotesConNumero
      .filter((l) => l.numero !== null && l.formulario101 !== null)
      .map((l) => ({ numero: l.numero!, codigo: parseInt(l.formulario101!.codigo, 10) }))
      .filter((l) => !isNaN(l.codigo));

    let f101Min: number | null = null;
    let f101Max: number | null = null;
    const f101Gaps: number[] = [];
    let f101FueraDeOrden = false;

    if (activosConF101.length > 0) {
      const codigos = activosConF101.map((l) => l.codigo);
      f101Min = Math.min(...codigos);
      f101Max = Math.max(...codigos);
      const setF101 = new Set(codigos);
      for (let i = f101Min; i <= f101Max; i++) {
        if (!setF101.has(i)) f101Gaps.push(i);
      }
      // ¿Los códigos van de menor a mayor al recorrer los lotes en orden de N°?
      for (let i = 1; i < activosConF101.length; i++) {
        if (activosConF101[i]!.codigo <= activosConF101[i - 1]!.codigo) {
          f101FueraDeOrden = true;
          break;
        }
      }
    }

    return {
      lotes: lotesConNumero.map((l) => ({
        id: l.id,
        correlativo: l.correlativo,
        numero: l.numero,
        estadoLote: l.estadoLote,
        fechaDocumentalFiscal: l.fechaDocumentalFiscal,
        transportista: l.transportista ? { nombreORazonSocial: l.transportista.nombreORazonSocial } : null,
        f101: l.formulario101 ? { codigo: l.formulario101.codigo, estado: l.formulario101.estado } : null,
      })),
      huecosCorrelativo,
      f101Min,
      f101Max,
      f101Gaps,
      f101FueraDeOrden,
    };
  },

  async getCierres(municipioId?: number) {
    return prisma.cierreLogisticaMensual.findMany({
      where: municipioId ? { municipioId } : {},
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
    });
  },
};
