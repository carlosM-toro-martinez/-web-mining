import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { generarNumeroLiquidacionTransporte } from "../../utils/correlativo.js";
import type {
  AgregarItemConceptoDTO,
  AnularLiquidacionDTO,
  CreateLiquidacionDTO,
  PreviewLiquidacionQuery,
} from "./liquidacion.types.js";
import type { z } from "zod";
import type { liquidacionQuerySchema } from "./liquidacion.schema.js";

type LiquidacionQuery = z.infer<typeof liquidacionQuerySchema>;

const INCLUDE_DETALLE = {
  transportista: true,
  detalleLotes: {
    include: { lote: { include: { vehiculo: true, tipoMineral: true, municipioOrigen: true, destinoIngenio: true } } },
  },
  itemsConcepto: { include: { concepto: true } },
  anulacion: true,
} as const;

// Prioridad de tarifa (de más a menos específica): (1) tarifa negociada con
// ESTE transportista puntual (contrato propio) + este mineral; (2) tarifa de
// este transportista para cualquier mineral; (3) tarifa genérica del tipo de
// entidad (Empresa/Particular) + este mineral; (4) genérica de ese tipo para
// cualquier mineral. La primera que exista y esté vigente en la fecha gana.
async function buscarTarifaAplicable(
  tipoEntidad: string,
  transportistaId: number,
  tipoMineralId: number,
  fecha: Date,
) {
  const vigente = (tipoMineralIdFiltro: number | null, transportistaIdFiltro: number | null) =>
    prisma.tarifaLiquidacion.findFirst({
      where: {
        tipoEntidad: tipoEntidad as any,
        tipoMineralId: tipoMineralIdFiltro,
        transportistaId: transportistaIdFiltro,
        vigenteDesde: { lte: fecha },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: fecha } }],
      },
      orderBy: { vigenteDesde: "desc" },
    });

  const [especificaTransportista, genericaTransportista, especificaTipo, genericaTipo] = await Promise.all([
    vigente(tipoMineralId, transportistaId),
    vigente(null, transportistaId),
    vigente(tipoMineralId, null),
    vigente(null, null),
  ]);

  return especificaTransportista ?? genericaTransportista ?? especificaTipo ?? genericaTipo ?? null;
}

interface LoteElegible {
  loteId: string;
  correlativo: string;
  fechaDespachoReal: Date;
  vehiculoPlaca: string;
  tipoMineral: string;
  tonelajeNeto: number;
  precioAplicado: number;
  subtotal: number;
}

// Lógica compartida entre preview() (solo lectura) y create() (persiste):
// arma la lista de lotes ACOPIADO de este transportista en el rango, con
// la tarifa ya resuelta — así el preview le muestra al usuario EXACTAMENTE
// lo que create() va a guardar, nunca un cálculo aproximado aparte.
async function construirElegibles(transportistaId: number, fechaInicio: Date, fechaFin: Date) {
  const transportista = await prisma.transportista.findUnique({ where: { id: transportistaId } });
  if (!transportista) throw new HttpError("Transportista no encontrado", 404);

  const lotes = await prisma.loteDespacho.findMany({
    where: {
      transportistaId,
      estadoLote: "ACOPIADO",
      fechaDespachoReal: { gte: fechaInicio, lte: fechaFin },
    },
    include: { pesaje: true, vehiculo: true, tipoMineral: true },
    orderBy: { fechaDespachoReal: "asc" },
  });

  const elegibles: LoteElegible[] = [];

  for (const lote of lotes) {
    if (!lote.pesaje) continue;

    const tarifa = await buscarTarifaAplicable(
      transportista.tipoEntidad,
      transportista.id,
      lote.tipoMineralId,
      lote.fechaDespachoReal,
    );
    if (!tarifa) {
      throw new HttpError(
        `No hay una tarifa de liquidación vigente para el lote ${lote.correlativo}. Registra la tarifa antes de continuar.`,
        400,
      );
    }

    const tonelajeNeto = Number(lote.pesaje.tonelajeNeto);
    const precioAplicado = Number(tarifa.precioPorTonelada);
    elegibles.push({
      loteId: lote.id,
      correlativo: lote.correlativo,
      fechaDespachoReal: lote.fechaDespachoReal,
      vehiculoPlaca: lote.vehiculo.placa,
      tipoMineral: lote.tipoMineral.nombre,
      tonelajeNeto,
      precioAplicado,
      subtotal: Math.round(tonelajeNeto * precioAplicado * 100) / 100,
    });
  }

  return { transportista, elegibles };
}

export const liquidacionService = {
  // Vista previa sin persistir: qué lotes y cuánto se le pagaría a este
  // transportista en este rango, para decidir ANTES de crear/cerrar nada.
  async preview(query: PreviewLiquidacionQuery) {
    const { transportista, elegibles } = await construirElegibles(
      query.transportistaId,
      query.fechaInicio,
      query.fechaFin,
    );

    const totalBruto = Math.round(elegibles.reduce((acc, e) => acc + e.subtotal, 0) * 100) / 100;

    return {
      transportista,
      lotes: elegibles,
      totalLotes: elegibles.length,
      totalBruto,
    };
  },
  async getAll(query: LiquidacionQuery) {
    const where: any = {};
    if (query.transportistaId) where.transportistaId = query.transportistaId;
    if (query.estado) where.estado = query.estado;

    return prisma.liquidacionPeriodo.findMany({
      where,
      include: { transportista: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.liquidacionPeriodo.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  },

  // Arma el detalle a partir de los lotes ACOPIADO del transportista dentro
  // del rango de fechas; la liquidación queda en BORRADOR hasta cerrarse.
  async create(data: CreateLiquidacionDTO, userId: number) {
    const { elegibles } = await construirElegibles(data.transportistaId, data.fechaInicio, data.fechaFin);

    if (elegibles.length === 0) {
      throw new HttpError("No hay lotes ACOPIADOS de este transportista en el rango de fechas indicado", 400);
    }

    const detalle = elegibles.map((e) => ({
      loteId: e.loteId,
      tonelajeNeto: e.tonelajeNeto,
      precioAplicado: e.precioAplicado,
      subtotal: e.subtotal,
    }));

    const liquidacion = await prisma.$transaction(async (tx) => {
      const creada = await tx.liquidacionPeriodo.create({
        data: {
          transportistaId: data.transportistaId,
          tipoPeriodo: data.tipoPeriodo,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          usuarioId: userId,
          detalleLotes: { create: detalle },
        },
        include: INCLUDE_DETALLE,
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_LIQUIDACION",
          data: { liquidacionId: creada.id, transportistaId: data.transportistaId, lotesIncluidos: detalle.length },
        },
      });

      return creada;
    });

    logger.info(
      { userId, liquidacionId: liquidacion.id, action: "CREATE_LIQUIDACION" },
      "Liquidación creada en borrador",
    );

    return liquidacion;
  },

  async agregarItemConcepto(liquidacionId: string, data: AgregarItemConceptoDTO, userId: number) {
    const [liquidacion, concepto] = await Promise.all([
      prisma.liquidacionPeriodo.findUnique({ where: { id: liquidacionId } }),
      prisma.conceptoLiquidacion.findUnique({ where: { id: data.conceptoId } }),
    ]);

    if (!liquidacion) throw new HttpError("Liquidación no encontrada", 404);
    if (liquidacion.estado !== "BORRADOR") {
      throw new HttpError("Solo se pueden agregar conceptos a una liquidación en BORRADOR", 409);
    }
    if (!concepto) throw new HttpError("Concepto de liquidación no encontrado", 404);

    const item = await prisma.liquidacionItemConcepto.create({
      data: {
        liquidacionId,
        conceptoId: data.conceptoId,
        monto: data.monto,
        descripcion: data.descripcion ?? null,
      },
      include: { concepto: true },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "AGREGAR_ITEM_CONCEPTO_LIQUIDACION",
        data: { liquidacionId, conceptoId: data.conceptoId, monto: data.monto },
      },
    });

    return item;
  },

  async quitarItemConcepto(liquidacionId: string, itemId: string, userId: number) {
    const [liquidacion, item] = await Promise.all([
      prisma.liquidacionPeriodo.findUnique({ where: { id: liquidacionId } }),
      prisma.liquidacionItemConcepto.findUnique({ where: { id: itemId } }),
    ]);

    if (!liquidacion) throw new HttpError("Liquidación no encontrada", 404);
    if (liquidacion.estado !== "BORRADOR") {
      throw new HttpError("Solo se pueden quitar conceptos de una liquidación en BORRADOR", 409);
    }
    if (!item || item.liquidacionId !== liquidacionId) {
      throw new HttpError("Concepto no encontrado en esta liquidación", 404);
    }

    await prisma.liquidacionItemConcepto.delete({ where: { id: itemId } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "QUITAR_ITEM_CONCEPTO_LIQUIDACION", data: { liquidacionId, itemId } },
    });
  },

  // Compare-and-swap: el `updateMany` con `estado: "BORRADOR"` en el where
  // asegura que, si dos clics de "Cerrar" llegan casi al mismo tiempo,
  // solo uno tenga éxito (count === 1) — el otro recibe 409 en vez de
  // duplicar el cierre. Mismo espíritu que la anulación atómica en
  // vales.service.ts, aplicado aquí al cierre de un período.
  async cerrar(id: string, userId: number) {
    return prisma.$transaction(async (tx) => {
      const liquidacion = await tx.liquidacionPeriodo.findUnique({
        where: { id },
        include: {
          detalleLotes: { include: { lote: true } },
          itemsConcepto: { include: { concepto: true } },
        },
      });
      if (!liquidacion) throw new HttpError("Liquidación no encontrada", 404);
      if (liquidacion.estado !== "BORRADOR") {
        throw new HttpError("Solo se puede cerrar una liquidación en BORRADOR", 409);
      }

      // Defensa extra: si un lote se anuló directamente (fuera de esta
      // liquidación) mientras esta seguía en BORRADOR, su fila queda
      // huérfana aquí — se descarta del total y se limpia, para no cobrar
      // por un viaje que ya no existe. anular() en loteDespacho.service.ts
      // ya limpia esto en el momento en que se anula; esto es solo por si
      // quedó una fila de antes de ese fix.
      const detalleValidos = liquidacion.detalleLotes.filter((d) => d.lote.estadoLote !== "ANULADO");
      const detalleInvalidosIds = liquidacion.detalleLotes
        .filter((d) => d.lote.estadoLote === "ANULADO")
        .map((d) => d.id);

      if (detalleValidos.length === 0) {
        throw new HttpError("Todos los lotes de esta liquidación fueron anulados; no hay nada que cerrar.", 409);
      }

      const totalBruto = detalleValidos.reduce((acc, d) => acc.add(d.subtotal), new Prisma.Decimal(0));
      const totalAbonos = liquidacion.itemsConcepto
        .filter((i) => i.concepto.tipo === "ABONO")
        .reduce((acc, i) => acc.add(i.monto), new Prisma.Decimal(0));
      const totalDeducciones = liquidacion.itemsConcepto
        .filter((i) => i.concepto.tipo === "DEDUCCION")
        .reduce((acc, i) => acc.add(i.monto), new Prisma.Decimal(0));
      const totalNeto = totalBruto.add(totalAbonos).sub(totalDeducciones);
      const numero = await generarNumeroLiquidacionTransporte(tx);

      if (detalleInvalidosIds.length > 0) {
        await tx.liquidacionDetalleLote.deleteMany({ where: { id: { in: detalleInvalidosIds } } });
      }

      const resultado = await tx.liquidacionPeriodo.updateMany({
        where: { id, estado: "BORRADOR" },
        data: { estado: "CERRADO", numero, totalBruto, totalAbonos, totalDeducciones, totalNeto },
      });
      if (resultado.count === 0) {
        throw new HttpError("La liquidación ya fue cerrada por otra operación", 409);
      }

      await tx.loteDespacho.updateMany({
        where: { id: { in: detalleValidos.map((d) => d.loteId) } },
        data: { estadoLote: "LIQUIDADO" },
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CERRAR_LIQUIDACION",
          data: { liquidacionId: id, totalNeto: totalNeto.toString() },
        },
      });

      return tx.liquidacionPeriodo.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });
  },

  // Anular una liquidación CERRADA revierte los lotes incluidos a
  // ACOPIADO para que puedan volver a incluirse en una liquidación
  // correcta — nunca queda un lote "huérfano" en LIQUIDADO sin liquidación vigente.
  async anular(id: string, data: AnularLiquidacionDTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const liquidacion = await tx.liquidacionPeriodo.findUnique({
        where: { id },
        include: { detalleLotes: true },
      });
      if (!liquidacion) throw new HttpError("Liquidación no encontrada", 404);
      if (liquidacion.estado === "ANULADO") throw new HttpError("La liquidación ya está anulada", 409);

      if (liquidacion.estado === "CERRADO") {
        await tx.loteDespacho.updateMany({
          where: { id: { in: liquidacion.detalleLotes.map((d) => d.loteId) }, estadoLote: "LIQUIDADO" },
          data: { estadoLote: "ACOPIADO" },
        });
      }

      await tx.liquidacionPeriodo.update({ where: { id }, data: { estado: "ANULADO" } });
      await tx.anulacionLiquidacion.create({
        data: { liquidacionId: id, usuarioId: userId, motivo: data.motivo },
      });

      await tx.log.create({
        data: { usuarioId: userId, accion: "ANULAR_LIQUIDACION", data: { liquidacionId: id, motivo: data.motivo } },
      });

      return tx.liquidacionPeriodo.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });
  },
};
