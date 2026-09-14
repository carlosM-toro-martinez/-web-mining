import { prisma } from "../../config/prisma.js";
import type { CreateTipoMineralDTO, UpdateTipoMineralDTO } from "./tipoMineral.types.js";
import type { z } from "zod";
import type { tipoMineralQuerySchema } from "./tipoMineral.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type TipoMineralQuery = z.infer<typeof tipoMineralQuerySchema>;

export const tipoMineralService = {
  async getAll(query: TipoMineralQuery) {
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

    return prisma.tipoMineral.findMany({ where, orderBy: { nombre: "asc" } });
  },

  async getById(id: number) {
    return prisma.tipoMineral.findUnique({ where: { id } });
  },

  async create(data: CreateTipoMineralDTO, userId: number) {
    const tipoMineral = await prisma.tipoMineral.create({
      data: { codigo: data.codigo, nombre: data.nombre, activo: data.activo ?? true },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_TIPO_MINERAL", data: { tipoMineralId: tipoMineral.id, ...data } },
    });

    logger.info({ userId, tipoMineralId: tipoMineral.id, action: "CREATE_TIPO_MINERAL" }, "Tipo de mineral creado");

    return tipoMineral;
  },

  async update(id: number, data: UpdateTipoMineralDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const tipoMineral = await prisma.tipoMineral.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_TIPO_MINERAL", data: { tipoMineralId: id, ...cleanData } },
    });

    logger.info({ userId, tipoMineralId: id, action: "UPDATE_TIPO_MINERAL" }, "Tipo de mineral actualizado");

    return tipoMineral;
  },

  async remove(id: number, userId: number) {
    const [enUsoAlicuota, enUsoTarifa] = await Promise.all([
      prisma.alicuotaRegalia.count({ where: { tipoMineralId: id } }),
      prisma.tarifaLiquidacion.count({ where: { tipoMineralId: id } }),
    ]);

    if (enUsoAlicuota > 0 || enUsoTarifa > 0) {
      throw new HttpError(
        "No se puede eliminar: el tipo de mineral tiene alícuotas o tarifas asociadas",
        409,
      );
    }

    await prisma.tipoMineral.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_TIPO_MINERAL", data: { tipoMineralId: id } },
    });

    logger.info({ userId, tipoMineralId: id, action: "DELETE_TIPO_MINERAL" }, "Tipo de mineral eliminado");
  },
};
