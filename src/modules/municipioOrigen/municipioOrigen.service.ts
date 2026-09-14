import { prisma } from "../../config/prisma.js";
import type { CreateMunicipioOrigenDTO, UpdateMunicipioOrigenDTO } from "./municipioOrigen.types.js";
import type { z } from "zod";
import type { municipioOrigenQuerySchema } from "./municipioOrigen.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type MunicipioOrigenQuery = z.infer<typeof municipioOrigenQuerySchema>;

export const municipioOrigenService = {
  async getAll(query: MunicipioOrigenQuery) {
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

    return prisma.municipioOrigen.findMany({ where, orderBy: { nombre: "asc" } });
  },

  async getById(id: number) {
    return prisma.municipioOrigen.findUnique({ where: { id } });
  },

  async create(data: CreateMunicipioOrigenDTO, userId: number) {
    const municipio = await prisma.municipioOrigen.create({
      data: { codigo: data.codigo, nombre: data.nombre, activo: data.activo ?? true },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_MUNICIPIO_ORIGEN",
        data: { municipioId: municipio.id, ...data },
      },
    });

    logger.info(
      { userId, municipioId: municipio.id, action: "CREATE_MUNICIPIO_ORIGEN" },
      "Municipio de origen creado",
    );

    return municipio;
  },

  async update(id: number, data: UpdateMunicipioOrigenDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const municipio = await prisma.municipioOrigen.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_MUNICIPIO_ORIGEN",
        data: { municipioId: id, ...cleanData },
      },
    });

    logger.info(
      { userId, municipioId: id, action: "UPDATE_MUNICIPIO_ORIGEN" },
      "Municipio de origen actualizado",
    );

    return municipio;
  },

  async remove(id: number, userId: number) {
    const enUso = await prisma.alicuotaRegalia.count({ where: { municipioOrigenId: id } });
    if (enUso > 0) {
      throw new HttpError(
        "No se puede eliminar: el municipio tiene alícuotas de regalía asociadas",
        409,
      );
    }

    await prisma.municipioOrigen.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_MUNICIPIO_ORIGEN", data: { municipioId: id } },
    });

    logger.info(
      { userId, municipioId: id, action: "DELETE_MUNICIPIO_ORIGEN" },
      "Municipio de origen eliminado",
    );
  },
};
