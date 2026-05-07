import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import type { BinCardQueryDTO, BinCardItem, BinCardValoradoItem } from "./reportes.types.js";

const startOfDayUTC = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const endOfDayUTC = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

export const reportesService = {
  async getBinCard(query: BinCardQueryDTO) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.productoId) {
      where.productoId = query.productoId;
    }

    if (query.fechaInicio || query.fechaFin) {
      where.createdAt = {};
      if (query.fechaInicio) {
        where.createdAt.gte = startOfDayUTC(query.fechaInicio);
      }
      if (query.fechaFin) {
        where.createdAt.lte = endOfDayUTC(query.fechaFin);
      }
    } else if (query.fecha) {
      // Para una fecha específica, usar el día completo
      where.createdAt = {
        gte: startOfDayUTC(query.fecha),
        lte: endOfDayUTC(query.fecha),
      };
    }

    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
        include: {
          usuarioEntrega: {
            select: { nombre: true },
          },
          producto: {
            select: { nombre: true },
          },
        },
      }),
      prisma.movimiento.count({ where }),
    ]);

    const items: BinCardItem[] = movimientos.map((mov) => ({
      id: mov.id,
      operationId: mov.operationId,
      fecha: mov.createdAt,
      tipo: mov.tipo,
      cantidad: Number(mov.cantidad),
      stockAntes: Number(mov.stockAntes),
      stockDespues: Number(mov.stockDespues),
      usuarioNombre: mov.usuarioEntrega?.nombre || "Desconocido",
      referencia: mov.referencia,
      referenciaId: mov.referenciaId,
      productoNombre: mov.producto.nombre,
    }));

    logger.info({ query, page, limit }, "Bin Card generado");

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getBinCardValorado(query: BinCardQueryDTO) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.productoId) {
      where.productoId = query.productoId;
    }

    if (query.fechaInicio || query.fechaFin) {
      where.createdAt = {};
      if (query.fechaInicio) {
        where.createdAt.gte = startOfDayUTC(query.fechaInicio);
      }
      if (query.fechaFin) {
        where.createdAt.lte = endOfDayUTC(query.fechaFin);
      }
    } else if (query.fecha) {
      where.createdAt = {
        gte: startOfDayUTC(query.fecha),
        lte: endOfDayUTC(query.fecha),
      };
    }

    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
        include: {
          usuarioEntrega: {
            select: { nombre: true },
          },
          producto: {
            select: { nombre: true },
          },
        },
      }),
      prisma.movimiento.count({ where }),
    ]);

    const items: BinCardValoradoItem[] = movimientos.map((mov) => ({
      id: mov.id,
      operationId: mov.operationId,
      fecha: mov.createdAt,
      tipo: mov.tipo,
      cantidad: Number(mov.cantidad),
      stockAntes: Number(mov.stockAntes),
      stockDespues: Number(mov.stockDespues),
      precioUnit: Number(mov.precioUnit),
      entradaBs: Number(mov.entradaBs),
      salidaBs: Number(mov.salidaBs),
      saldoBs: Number(mov.saldoBs),
      usuarioNombre: mov.usuarioEntrega?.nombre || "Desconocido",
      referencia: mov.referencia,
      referenciaId: mov.referenciaId,
      productoNombre: mov.producto.nombre,
    }));

    logger.info({ query, page, limit }, "Bin Card Valorado generado");

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
