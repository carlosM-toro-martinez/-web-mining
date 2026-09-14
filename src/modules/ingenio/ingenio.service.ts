import { prisma } from "../../config/prisma.js";
import type { CreateIngenioDTO, UpdateIngenioDTO } from "./ingenio.types.js";
import type { z } from "zod";
import type { ingenioQuerySchema } from "./ingenio.schema.js";
import { logger } from "../../config/logger.js";

type IngenioQuery = z.infer<typeof ingenioQuerySchema>;

export const ingenioService = {
  async getAll(query: IngenioQuery) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { nombre: { contains: String(query.search), mode: "insensitive" as const } },
        { codigo: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    if (query.soloActivos) {
      where.activo = true;
    }

    return prisma.ingenio.findMany({ where, orderBy: { nombre: "asc" } });
  },

  async getById(id: number) {
    return prisma.ingenio.findUnique({ where: { id } });
  },

  async create(data: CreateIngenioDTO, userId: number) {
    const ingenio = await prisma.ingenio.create({
      data: { codigo: data.codigo, nombre: data.nombre, activo: data.activo ?? true },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_INGENIO", data: { ingenioId: ingenio.id, ...data } },
    });

    logger.info({ userId, ingenioId: ingenio.id, action: "CREATE_INGENIO" }, "Ingenio creado");

    return ingenio;
  },

  async update(id: number, data: UpdateIngenioDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const ingenio = await prisma.ingenio.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_INGENIO", data: { ingenioId: id, ...cleanData } },
    });

    logger.info({ userId, ingenioId: id, action: "UPDATE_INGENIO" }, "Ingenio actualizado");

    return ingenio;
  },

  // Nota: cuando se agregue LoteDespacho (Fase 3), este método debe validar
  // primero que el ingenio no tenga lotes asociados, igual que
  // municipioOrigenService.remove valida AlicuotaRegalia.
  async remove(id: number, userId: number) {
    await prisma.ingenio.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_INGENIO", data: { ingenioId: id } },
    });

    logger.info({ userId, ingenioId: id, action: "DELETE_INGENIO" }, "Ingenio eliminado");
  },
};
