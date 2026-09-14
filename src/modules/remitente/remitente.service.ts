import { prisma } from "../../config/prisma.js";
import type { CreateRemitenteDTO, UpdateRemitenteDTO } from "./remitente.types.js";
import type { z } from "zod";
import type { remitenteQuerySchema } from "./remitente.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type RemitenteQuery = z.infer<typeof remitenteQuerySchema>;

export const remitenteService = {
  async getAll(query: RemitenteQuery) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { nombreORazonSocial: { contains: String(query.search), mode: "insensitive" as const } },
        { nitOCi: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    if (query.tipoEntidad) where.tipoEntidad = query.tipoEntidad;
    if (query.soloActivos) where.activo = true;

    return prisma.remitente.findMany({
      where,
      include: { municipio: true },
      orderBy: { nombreORazonSocial: "asc" },
    });
  },

  async getById(id: number) {
    return prisma.remitente.findUnique({ where: { id }, include: { municipio: true } });
  },

  async create(data: CreateRemitenteDTO, userId: number) {
    if (data.municipioId) {
      const municipio = await prisma.municipioOrigen.findUnique({ where: { id: data.municipioId } });
      if (!municipio) throw new HttpError("Municipio no encontrado", 404);
    }

    const remitente = await prisma.remitente.create({
      data: {
        tipoEntidad: data.tipoEntidad,
        nombreORazonSocial: data.nombreORazonSocial,
        nitOCi: data.nitOCi,
        municipioId: data.municipioId ?? null,
        cuentaContableId: data.cuentaContableId ?? null,
        activo: data.activo ?? true,
      },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_REMITENTE", data: { remitenteId: remitente.id, ...data } },
    });

    logger.info({ userId, remitenteId: remitente.id, action: "CREATE_REMITENTE" }, "Remitente creado");

    return remitente;
  },

  async update(id: number, data: UpdateRemitenteDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const remitente = await prisma.remitente.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_REMITENTE", data: { remitenteId: id, ...cleanData } },
    });

    logger.info({ userId, remitenteId: id, action: "UPDATE_REMITENTE" }, "Remitente actualizado");

    return remitente;
  },

  // Se prefiere desactivar (activo: false) antes que eliminar; solo se
  // permite el borrado físico si el remitente nunca llegó a usarse.
  async remove(id: number, userId: number) {
    const enUso = await prisma.vehiculo.count({ where: { propietarioId: id } });
    if (enUso > 0) {
      throw new HttpError(
        "No se puede eliminar: el remitente tiene vehículos asociados. Desactívalo en su lugar.",
        409,
      );
    }

    await prisma.remitente.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_REMITENTE", data: { remitenteId: id } },
    });

    logger.info({ userId, remitenteId: id, action: "DELETE_REMITENTE" }, "Remitente eliminado");
  },
};
