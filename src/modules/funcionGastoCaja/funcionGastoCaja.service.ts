import { prisma } from "../../config/prisma.js";
import type { CreateFuncionGastoCajaDTO, UpdateFuncionGastoCajaDTO } from "./funcionGastoCaja.types.js";
import type { z } from "zod";
import type { funcionGastoCajaQuerySchema } from "./funcionGastoCaja.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type FuncionGastoCajaQuery = z.infer<typeof funcionGastoCajaQuerySchema>;

// Mismo límite de 2 niveles (grupo → subgrupo) que CategoriaInventario.
async function validarParent(parentId: number | null | undefined) {
  if (!parentId) return;

  const parent = await prisma.funcionGastoCaja.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true },
  });

  if (!parent) throw new HttpError("Función de gasto padre no encontrada", 404);
  if (parent.parentId !== null) {
    throw new HttpError("Solo se permiten 2 niveles: grupo → subgrupo", 400);
  }
}

export const funcionGastoCajaService = {
  async getAll(query: FuncionGastoCajaQuery) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { nombre: { contains: String(query.search), mode: "insensitive" as const } },
        { codigo: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    if (query.soloRaices) where.parentId = null;
    if (query.soloActivos) where.activo = true;

    return prisma.funcionGastoCaja.findMany({
      where,
      include: { parent: true },
      orderBy: { codigo: "asc" },
    });
  },

  async getById(id: number) {
    return prisma.funcionGastoCaja.findUnique({
      where: { id },
      include: { parent: true, children: true },
    });
  },

  async create(data: CreateFuncionGastoCajaDTO, userId: number) {
    await validarParent(data.parentId ?? null);

    const funcion = await prisma.funcionGastoCaja.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        tipo: data.tipo,
        parentId: data.parentId ?? null,
        activo: data.activo ?? true,
      },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_FUNCION_GASTO_CAJA", data: { funcionId: funcion.id, ...data } },
    });

    logger.info(
      { userId, funcionId: funcion.id, action: "CREATE_FUNCION_GASTO_CAJA" },
      "Función de gasto de caja creada",
    );

    return funcion;
  },

  async update(id: number, data: UpdateFuncionGastoCajaDTO, userId: number) {
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new HttpError("Una función de gasto no puede ser su propio padre", 400);
      }
      await validarParent(data.parentId);
    }

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const funcion = await prisma.funcionGastoCaja.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_FUNCION_GASTO_CAJA", data: { funcionId: id, ...cleanData } },
    });

    logger.info(
      { userId, funcionId: id, action: "UPDATE_FUNCION_GASTO_CAJA" },
      "Función de gasto de caja actualizada",
    );

    return funcion;
  },

  async remove(id: number, userId: number) {
    const enUso = await prisma.funcionGastoCaja.count({ where: { parentId: id } });
    if (enUso > 0) {
      throw new HttpError("No se puede eliminar: tiene subgrupos asociados", 409);
    }

    await prisma.funcionGastoCaja.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_FUNCION_GASTO_CAJA", data: { funcionId: id } },
    });

    logger.info(
      { userId, funcionId: id, action: "DELETE_FUNCION_GASTO_CAJA" },
      "Función de gasto de caja eliminada",
    );
  },
};
