import { prisma } from "../../config/prisma.js";
import type { CreateTransportistaDTO, UpdateTransportistaDTO } from "./transportista.types.js";
import type { z } from "zod";
import type { transportistaQuerySchema } from "./transportista.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type TransportistaQuery = z.infer<typeof transportistaQuerySchema>;

export const transportistaService = {
  async getAll(query: TransportistaQuery) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { nombreORazonSocial: { contains: String(query.search), mode: "insensitive" as const } },
        { nitOCi: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    if (query.tipoEntidad) where.tipoEntidad = query.tipoEntidad;
    if (query.soloActivos) where.activo = true;

    return prisma.transportista.findMany({
      where,
      orderBy: { nombreORazonSocial: "asc" },
    });
  },

  async getById(id: number) {
    return prisma.transportista.findUnique({ where: { id } });
  },

  async create(data: CreateTransportistaDTO, userId: number) {
    const transportista = await prisma.transportista.create({
      data: {
        tipoEntidad: data.tipoEntidad,
        nombreORazonSocial: data.nombreORazonSocial,
        nitOCi: data.nitOCi,
        banco: data.banco ?? null,
        numeroCuenta: data.numeroCuenta ?? null,
        cuentaContableId: data.cuentaContableId ?? null,
        activo: data.activo ?? true,
      },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_TRANSPORTISTA", data: { transportistaId: transportista.id, ...data } },
    });

    logger.info({ userId, transportistaId: transportista.id, action: "CREATE_TRANSPORTISTA" }, "Transportista creado");

    return transportista;
  },

  async update(id: number, data: UpdateTransportistaDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const transportista = await prisma.transportista.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_TRANSPORTISTA", data: { transportistaId: id, ...cleanData } },
    });

    logger.info({ userId, transportistaId: id, action: "UPDATE_TRANSPORTISTA" }, "Transportista actualizado");

    return transportista;
  },

  // Se prefiere desactivar (activo: false) antes que eliminar; solo se
  // permite el borrado físico si el transportista nunca llegó a usarse.
  async remove(id: number, userId: number) {
    const enUso = await prisma.vehiculo.count({ where: { propietarioId: id } });
    if (enUso > 0) {
      throw new HttpError(
        "No se puede eliminar: el transportista tiene vehículos asociados. Desactívalo en su lugar.",
        409,
      );
    }

    await prisma.transportista.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_TRANSPORTISTA", data: { transportistaId: id } },
    });

    logger.info({ userId, transportistaId: id, action: "DELETE_TRANSPORTISTA" }, "Transportista eliminado");
  },
};
