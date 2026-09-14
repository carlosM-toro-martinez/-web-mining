import { prisma } from "../../config/prisma.js";
import type {
  CreateConceptoLiquidacionDTO,
  UpdateConceptoLiquidacionDTO,
} from "./conceptoLiquidacion.types.js";
import type { z } from "zod";
import type { conceptoLiquidacionQuerySchema } from "./conceptoLiquidacion.schema.js";
import { logger } from "../../config/logger.js";

type ConceptoLiquidacionQuery = z.infer<typeof conceptoLiquidacionQuerySchema>;

export const conceptoLiquidacionService = {
  async getAll(query: ConceptoLiquidacionQuery) {
    const where: any = {};

    if (query.search) {
      where.nombre = { contains: String(query.search), mode: "insensitive" as const };
    }

    if (query.tipo) {
      where.tipo = query.tipo;
    }

    if (query.soloActivos) {
      where.activo = true;
    }

    return prisma.conceptoLiquidacion.findMany({ where, orderBy: { nombre: "asc" } });
  },

  async getById(id: number) {
    return prisma.conceptoLiquidacion.findUnique({ where: { id } });
  },

  async create(data: CreateConceptoLiquidacionDTO, userId: number) {
    const concepto = await prisma.conceptoLiquidacion.create({
      data: { nombre: data.nombre, tipo: data.tipo, activo: data.activo ?? true },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_CONCEPTO_LIQUIDACION", data: { conceptoId: concepto.id, ...data } },
    });

    logger.info(
      { userId, conceptoId: concepto.id, action: "CREATE_CONCEPTO_LIQUIDACION" },
      "Concepto de liquidación creado",
    );

    return concepto;
  },

  async update(id: number, data: UpdateConceptoLiquidacionDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const concepto = await prisma.conceptoLiquidacion.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_CONCEPTO_LIQUIDACION", data: { conceptoId: id, ...cleanData } },
    });

    logger.info(
      { userId, conceptoId: id, action: "UPDATE_CONCEPTO_LIQUIDACION" },
      "Concepto de liquidación actualizado",
    );

    return concepto;
  },

  // Nota: cuando se agregue LiquidacionItemConcepto (Fase 4), este método debe
  // validar que el concepto no esté en uso antes de eliminarlo. Mientras tanto,
  // preferir desactivar (activo: false) en vez de eliminar.
  async remove(id: number, userId: number) {
    await prisma.conceptoLiquidacion.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_CONCEPTO_LIQUIDACION", data: { conceptoId: id } },
    });

    logger.info(
      { userId, conceptoId: id, action: "DELETE_CONCEPTO_LIQUIDACION" },
      "Concepto de liquidación eliminado",
    );
  },
};
