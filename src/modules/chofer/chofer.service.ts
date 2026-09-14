import { prisma } from "../../config/prisma.js";
import type { CreateChoferDTO, UpdateChoferDTO } from "./chofer.types.js";
import type { z } from "zod";
import type { choferQuerySchema } from "./chofer.schema.js";
import { logger } from "../../config/logger.js";

type ChoferQuery = z.infer<typeof choferQuerySchema>;

export const choferService = {
  async getAll(query: ChoferQuery) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { nombre: { contains: String(query.search), mode: "insensitive" as const } },
        { ci: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    if (query.soloActivos) where.activo = true;

    return prisma.chofer.findMany({ where, orderBy: { nombre: "asc" } });
  },

  async getById(id: number) {
    return prisma.chofer.findUnique({ where: { id } });
  },

  async create(data: CreateChoferDTO, userId: number) {
    const chofer = await prisma.chofer.create({
      data: {
        nombre: data.nombre,
        ci: data.ci,
        licencia: data.licencia ?? null,
        activo: data.activo ?? true,
      },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_CHOFER", data: { choferId: chofer.id, ...data } },
    });

    logger.info({ userId, choferId: chofer.id, action: "CREATE_CHOFER" }, "Chofer creado");

    return chofer;
  },

  async update(id: number, data: UpdateChoferDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const chofer = await prisma.chofer.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_CHOFER", data: { choferId: id, ...cleanData } },
    });

    logger.info({ userId, choferId: id, action: "UPDATE_CHOFER" }, "Chofer actualizado");

    return chofer;
  },

  // Sin borrado físico: un chofer queda ligado a lotes históricos (Fase 3),
  // así que se desactiva (activo: false) en vez de eliminarse.
};
