import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type { AgregarItemConceptoDTO, AnularLiquidacionDTO, CreateLiquidacionDTO } from "./liquidacion.types.js";
import type { z } from "zod";
import type { liquidacionQuerySchema } from "./liquidacion.schema.js";

type LiquidacionQuery = z.infer<typeof liquidacionQuerySchema>;

const INCLUDE_DETALLE = {
  remitente: true,
  detalleLotes: { include: { lote: true } },
  itemsConcepto: { include: { concepto: true } },
  anulacion: true,
} as const;

// Prioriza la tarifa específica del tipo de mineral del lote; si no existe,
// cae a la tarifa genérica (tipoMineralId null = "aplica a todos").
async function buscarTarifaAplicable(tipoEntidad: string, tipoMineralId: number, fecha: Date) {
  const [especifica, generica] = await Promise.all([
    prisma.tarifaLiquidacion.findFirst({
      where: {
        tipoEntidad: tipoEntidad as any,
        tipoMineralId,
        vigenteDesde: { lte: fecha },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: fecha } }],
      },
      orderBy: { vigenteDesde: "desc" },
    }),
    prisma.tarifaLiquidacion.findFirst({
      where: {
        tipoEntidad: tipoEntidad as any,
        tipoMineralId: null,
        vigenteDesde: { lte: fecha },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: fecha } }],
      },
      orderBy: { vigenteDesde: "desc" },
    }),
  ]);

  return especifica ?? generica ?? null;
}

export const liquidacionService = {
  async getAll(query: LiquidacionQuery) {
    const where: any = {};
    if (query.remitenteId) where.remitenteId = query.remitenteId;
    if (query.estado) where.estado = query.estado;

    return prisma.liquidacionPeriodo.findMany({
      where,
      include: { remitente: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.liquidacionPeriodo.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  },

  // Arma el detalle a partir de los lotes ACOPIADO del remitente dentro
  // del rango de fechas; la liquidación queda en BORRADOR hasta cerrarse.
  async create(data: CreateLiquidacionDTO, userId: number) {
    const remitente = await prisma.remitente.findUnique({ where: { id: data.remitenteId } });
    if (!remitente) throw new HttpError("Remitente no encontrado", 404);

    const lotesElegibles = await prisma.loteDespacho.findMany({
      where: {
        remitenteId: data.remitenteId,
        estadoLote: "ACOPIADO",
        fechaDespachoReal: { gte: data.fechaInicio, lte: data.fechaFin },
      },
      include: { pesaje: true },
    });

    if (lotesElegibles.length === 0) {
      throw new HttpError("No hay lotes ACOPIADOS de este remitente en el rango de fechas indicado", 400);
    }

    const detalle: { loteId: string; tonelajeNeto: number; precioAplicado: number; subtotal: number }[] = [];

    for (const lote of lotesElegibles) {
      if (!lote.pesaje) continue;

      const tarifa = await buscarTarifaAplicable(remitente.tipoEntidad, lote.tipoMineralId, lote.fechaDespachoReal);
      if (!tarifa) {
        throw new HttpError(
          `No hay una tarifa de liquidación vigente para el lote ${lote.correlativo}. Registra la tarifa antes de continuar.`,
          400,
        );
      }

      const tonelajeNeto = Number(lote.pesaje.tonelajeNeto);
      const precioAplicado = Number(tarifa.precioPorTonelada);
      detalle.push({
        loteId: lote.id,
        tonelajeNeto,
        precioAplicado,
        subtotal: Math.round(tonelajeNeto * precioAplicado * 100) / 100,
      });
    }

    const liquidacion = await prisma.$transaction(async (tx) => {
      const creada = await tx.liquidacionPeriodo.create({
        data: {
          remitenteId: data.remitenteId,
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
          data: { liquidacionId: creada.id, remitenteId: data.remitenteId, lotesIncluidos: detalle.length },
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
        include: { detalleLotes: true, itemsConcepto: { include: { concepto: true } } },
      });
      if (!liquidacion) throw new HttpError("Liquidación no encontrada", 404);
      if (liquidacion.estado !== "BORRADOR") {
        throw new HttpError("Solo se puede cerrar una liquidación en BORRADOR", 409);
      }

      const totalBruto = liquidacion.detalleLotes.reduce(
        (acc, d) => acc.add(d.subtotal),
        new Prisma.Decimal(0),
      );
      const totalAbonos = liquidacion.itemsConcepto
        .filter((i) => i.concepto.tipo === "ABONO")
        .reduce((acc, i) => acc.add(i.monto), new Prisma.Decimal(0));
      const totalDeducciones = liquidacion.itemsConcepto
        .filter((i) => i.concepto.tipo === "DEDUCCION")
        .reduce((acc, i) => acc.add(i.monto), new Prisma.Decimal(0));
      const totalNeto = totalBruto.add(totalAbonos).sub(totalDeducciones);

      const resultado = await tx.liquidacionPeriodo.updateMany({
        where: { id, estado: "BORRADOR" },
        data: { estado: "CERRADO", totalBruto, totalAbonos, totalDeducciones, totalNeto },
      });
      if (resultado.count === 0) {
        throw new HttpError("La liquidación ya fue cerrada por otra operación", 409);
      }

      await tx.loteDespacho.updateMany({
        where: { id: { in: liquidacion.detalleLotes.map((d) => d.loteId) } },
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
