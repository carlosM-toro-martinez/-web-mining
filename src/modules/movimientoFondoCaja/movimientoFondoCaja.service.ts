import { prisma } from "../../config/prisma.js";
import type { CreateMovimientoFondoCajaDTO } from "./movimientoFondoCaja.types.js";
import type { z } from "zod";
import type { movimientoFondoCajaQuerySchema } from "./movimientoFondoCaja.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type MovimientoFondoCajaQuery = z.infer<typeof movimientoFondoCajaQuerySchema>;

export const movimientoFondoCajaService = {
  async getAll(query: MovimientoFondoCajaQuery) {
    const where: any = {};
    if (query.cajaId) where.cajaId = query.cajaId;
    if (query.fechaInicio || query.fechaFin) {
      where.fecha = {};
      if (query.fechaInicio) where.fecha.gte = query.fechaInicio;
      if (query.fechaFin) where.fecha.lte = query.fechaFin;
    }

    return prisma.movimientoFondoCaja.findMany({
      where,
      include: { caja: true },
      orderBy: { fecha: "desc" },
    });
  },

  async create(data: CreateMovimientoFondoCajaDTO, userId: number) {
    const caja = await prisma.cajaChica.findUnique({ where: { id: data.cajaId } });
    if (!caja) throw new HttpError("Caja chica no encontrada", 404);

    const movimiento = await prisma.movimientoFondoCaja.create({
      data: {
        cajaId: data.cajaId,
        tipo: data.tipo,
        monto: data.monto,
        moneda: data.moneda,
        fecha: data.fecha,
        referencia: data.referencia ?? null,
        usuarioId: userId,
      },
      include: { caja: true },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_MOVIMIENTO_FONDO_CAJA",
        data: { movimientoId: movimiento.id, cajaId: data.cajaId, monto: data.monto },
      },
    });

    logger.info(
      { userId, movimientoId: movimiento.id, action: "CREATE_MOVIMIENTO_FONDO_CAJA" },
      "Movimiento de fondo de caja registrado",
    );

    return movimiento;
  },
};
