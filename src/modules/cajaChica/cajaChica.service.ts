import { prisma } from "../../config/prisma.js";
import type { CreateCajaChicaDTO, UpdateCajaChicaDTO } from "./cajaChica.types.js";
import type { z } from "zod";
import type { cajaChicaQuerySchema } from "./cajaChica.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type CajaChicaQuery = z.infer<typeof cajaChicaQuerySchema>;

export const cajaChicaService = {
  async getAll(query: CajaChicaQuery) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { nombre: { contains: String(query.search), mode: "insensitive" as const } },
        { codigo: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    if (query.soloActivas) where.activo = true;

    return prisma.cajaChica.findMany({ where, orderBy: { codigo: "asc" } });
  },

  async getById(id: number) {
    return prisma.cajaChica.findUnique({ where: { id } });
  },

  async create(data: CreateCajaChicaDTO, userId: number) {
    const caja = await prisma.cajaChica.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        monedaBase: data.monedaBase ?? "BOB",
        saldoInicial: data.saldoInicial ?? 0,
        encargadoNombre: data.encargadoNombre ?? null,
        encargadoUsuarioId: data.encargadoUsuarioId ?? null,
        activo: data.activo ?? true,
      },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_CAJA_CHICA", data: { cajaId: caja.id, ...data } },
    });

    logger.info({ userId, cajaId: caja.id, action: "CREATE_CAJA_CHICA" }, "Caja chica creada");

    return caja;
  },

  async update(id: number, data: UpdateCajaChicaDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const caja = await prisma.cajaChica.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_CAJA_CHICA", data: { cajaId: id, ...cleanData } },
    });

    logger.info({ userId, cajaId: id, action: "UPDATE_CAJA_CHICA" }, "Caja chica actualizada");

    return caja;
  },

  async remove(id: number, userId: number) {
    const caja = await prisma.cajaChica.findUnique({
      where: { id },
      include: {
        _count: {
          select: { gastos: true, movimientosFondo: true, rendiciones: true, movimientosBanco: true, partidasPresupuesto: true },
        },
      },
    });

    if (!caja) {
      throw new HttpError("La caja ya no existe.", 404);
    }

    const totalMovimientos =
      caja._count.gastos +
      caja._count.movimientosFondo +
      caja._count.rendiciones +
      caja._count.movimientosBanco +
      caja._count.partidasPresupuesto;

    if (totalMovimientos > 0) {
      throw new HttpError(
        "No se puede eliminar: esta caja ya tiene gastos, movimientos, rendiciones o partidas de presupuesto registrados.",
        409,
      );
    }

    await prisma.cajaChica.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_CAJA_CHICA", data: { cajaId: id } },
    });

    logger.info({ userId, cajaId: id, action: "DELETE_CAJA_CHICA" }, "Caja chica eliminada");
  },
};
