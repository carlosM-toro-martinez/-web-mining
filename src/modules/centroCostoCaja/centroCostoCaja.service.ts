import { prisma } from "../../config/prisma.js";
import type { CreateCentroCostoCajaDTO, UpdateCentroCostoCajaDTO } from "./centroCostoCaja.types.js";
import type { z } from "zod";
import type { centroCostoCajaQuerySchema } from "./centroCostoCaja.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type CentroCostoCajaQuery = z.infer<typeof centroCostoCajaQuerySchema>;

// Mismo límite de 2 niveles (grupo → subgrupo) que CategoriaInventario.
async function validarParent(parentId: number | null | undefined) {
  if (!parentId) return;

  const parent = await prisma.centroCostoCaja.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true },
  });

  if (!parent) throw new HttpError("Centro de costo padre no encontrado", 404);
  if (parent.parentId !== null) {
    throw new HttpError("Solo se permiten 2 niveles: grupo → subgrupo", 400);
  }
}

export const centroCostoCajaService = {
  async getAll(query: CentroCostoCajaQuery) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { nombre: { contains: String(query.search), mode: "insensitive" as const } },
        { codigo: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    if (query.soloRaices) where.parentId = null;
    if (query.soloActivos) where.activo = true;

    return prisma.centroCostoCaja.findMany({
      where,
      include: { parent: true },
      orderBy: { codigo: "asc" },
    });
  },

  async getById(id: number) {
    return prisma.centroCostoCaja.findUnique({
      where: { id },
      include: { parent: true, children: true },
    });
  },

  async create(data: CreateCentroCostoCajaDTO, userId: number) {
    await validarParent(data.parentId ?? null);

    const centro = await prisma.centroCostoCaja.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        parentId: data.parentId ?? null,
        activo: data.activo ?? true,
      },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_CENTRO_COSTO_CAJA", data: { centroId: centro.id, ...data } },
    });

    logger.info(
      { userId, centroId: centro.id, action: "CREATE_CENTRO_COSTO_CAJA" },
      "Centro de costo de caja creado",
    );

    return centro;
  },

  async update(id: number, data: UpdateCentroCostoCajaDTO, userId: number) {
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new HttpError("Un centro de costo no puede ser su propio padre", 400);
      }
      await validarParent(data.parentId);
    }

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const centro = await prisma.centroCostoCaja.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_CENTRO_COSTO_CAJA", data: { centroId: id, ...cleanData } },
    });

    logger.info(
      { userId, centroId: id, action: "UPDATE_CENTRO_COSTO_CAJA" },
      "Centro de costo de caja actualizado",
    );

    return centro;
  },

  async remove(id: number, userId: number) {
    const enUso = await prisma.centroCostoCaja.count({ where: { parentId: id } });
    if (enUso > 0) {
      throw new HttpError("No se puede eliminar: tiene subgrupos asociados", 409);
    }

    await prisma.centroCostoCaja.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_CENTRO_COSTO_CAJA", data: { centroId: id } },
    });

    logger.info(
      { userId, centroId: id, action: "DELETE_CENTRO_COSTO_CAJA" },
      "Centro de costo de caja eliminado",
    );
  },
};
