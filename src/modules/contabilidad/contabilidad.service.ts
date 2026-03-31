import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreateCentroCostoDTO,
  UpdateCentroCostoDTO,
  CreateFuncionGastoDTO,
  UpdateFuncionGastoDTO,
  CreateCuentaContableDTO,
  UpdateCuentaContableDTO,
} from "./contabilidad.types.js";

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new HttpError("Ya existe un registro con datos únicos duplicados", 409, error.meta);
    }
    if (error.code === "P2003") {
      throw new HttpError("Relación inválida: revisa IDs relacionados", 400, error.meta);
    }
  }
  throw error;
}

async function validateCuentaRelacion(centroCostoId: number, funcionGastoId: number) {
  const [centroCosto, funcionGasto] = await Promise.all([
    prisma.centroCosto.findUnique({ where: { id: centroCostoId }, select: { id: true } }),
    prisma.funcionGasto.findUnique({ where: { id: funcionGastoId }, select: { id: true } }),
  ]);

  if (!centroCosto) {
    throw new HttpError("Centro de costo no encontrado", 404);
  }

  if (!funcionGasto) {
    throw new HttpError("Función de gasto no encontrada", 404);
  }
}

export const contabilidadService = {
  async getCentrosCosto() {
    return prisma.centroCosto.findMany({
      include: {
        _count: { select: { cuentas: true } },
      },
      orderBy: [{ codigo: "asc" }],
    });
  },

  async getCentroCostoById(id: number) {
    return prisma.centroCosto.findUnique({
      where: { id },
      include: {
        cuentas: {
          include: { funcionGasto: true },
          orderBy: [{ codigoCompleto: "asc" }],
        },
      },
    });
  },

  async createCentroCosto(data: CreateCentroCostoDTO, userId: number) {
    try {
      const created = await prisma.centroCosto.create({ data });

      await prisma.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_CENTRO_COSTO",
          data: { centroCostoId: created.id, ...data },
        },
      });

      logger.info(
        { userId, centroCostoId: created.id, action: "CREATE_CENTRO_COSTO" },
        "Centro de costo creado",
      );

      return created;
    } catch (error) {
      mapPrismaError(error);
    }
  },

  async updateCentroCosto(id: number, data: UpdateCentroCostoDTO, userId: number) {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    if (Object.keys(cleanData).length === 0) {
      throw new HttpError("No se enviaron campos para actualizar", 400);
    }

    try {
      const updated = await prisma.centroCosto.update({
        where: { id },
        data: cleanData,
      });

      await prisma.log.create({
        data: {
          usuarioId: userId,
          accion: "UPDATE_CENTRO_COSTO",
          data: { centroCostoId: id, ...cleanData },
        },
      });

      logger.info(
        { userId, centroCostoId: id, action: "UPDATE_CENTRO_COSTO" },
        "Centro de costo actualizado",
      );

      return updated;
    } catch (error) {
      mapPrismaError(error);
    }
  },

  async deleteCentroCosto(id: number, userId: number) {
    const centro = await prisma.centroCosto.findUnique({
      where: { id },
      include: { _count: { select: { cuentas: true } } },
    });

    if (!centro) {
      throw new HttpError("Centro de costo no encontrado", 404);
    }

    if (centro._count.cuentas > 0) {
      throw new HttpError("No se puede eliminar: tiene cuentas contables asociadas", 409);
    }

    await prisma.centroCosto.delete({ where: { id } });
    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "DELETE_CENTRO_COSTO",
        data: { centroCostoId: id },
      },
    });

    logger.info({ userId, centroCostoId: id, action: "DELETE_CENTRO_COSTO" }, "Centro eliminado");
  },

  async getFuncionesGasto() {
    return prisma.funcionGasto.findMany({
      include: {
        _count: { select: { cuentas: true } },
      },
      orderBy: [{ codigo: "asc" }],
    });
  },

  async getFuncionGastoById(id: number) {
    return prisma.funcionGasto.findUnique({
      where: { id },
      include: {
        cuentas: {
          include: { centroCosto: true },
          orderBy: [{ codigoCompleto: "asc" }],
        },
      },
    });
  },

  async createFuncionGasto(data: CreateFuncionGastoDTO, userId: number) {
    try {
      const created = await prisma.funcionGasto.create({ data });

      await prisma.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_FUNCION_GASTO",
          data: { funcionGastoId: created.id, ...data },
        },
      });

      logger.info(
        { userId, funcionGastoId: created.id, action: "CREATE_FUNCION_GASTO" },
        "Función de gasto creada",
      );

      return created;
    } catch (error) {
      mapPrismaError(error);
    }
  },

  async updateFuncionGasto(id: number, data: UpdateFuncionGastoDTO, userId: number) {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    if (Object.keys(cleanData).length === 0) {
      throw new HttpError("No se enviaron campos para actualizar", 400);
    }

    try {
      const updated = await prisma.funcionGasto.update({
        where: { id },
        data: cleanData,
      });

      await prisma.log.create({
        data: {
          usuarioId: userId,
          accion: "UPDATE_FUNCION_GASTO",
          data: { funcionGastoId: id, ...cleanData },
        },
      });

      logger.info(
        { userId, funcionGastoId: id, action: "UPDATE_FUNCION_GASTO" },
        "Función de gasto actualizada",
      );

      return updated;
    } catch (error) {
      mapPrismaError(error);
    }
  },

  async deleteFuncionGasto(id: number, userId: number) {
    const funcion = await prisma.funcionGasto.findUnique({
      where: { id },
      include: { _count: { select: { cuentas: true } } },
    });

    if (!funcion) {
      throw new HttpError("Función de gasto no encontrada", 404);
    }

    if (funcion._count.cuentas > 0) {
      throw new HttpError("No se puede eliminar: tiene cuentas contables asociadas", 409);
    }

    await prisma.funcionGasto.delete({ where: { id } });
    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "DELETE_FUNCION_GASTO",
        data: { funcionGastoId: id },
      },
    });

    logger.info(
      { userId, funcionGastoId: id, action: "DELETE_FUNCION_GASTO" },
      "Función de gasto eliminada",
    );
  },

  async getCuentasContables() {
    return prisma.cuentaContable.findMany({
      include: {
        centroCosto: true,
        funcionGasto: true,
        _count: { select: { movimientos: true } },
      },
      orderBy: [{ codigoCompleto: "asc" }],
    });
  },

  async getCuentaContableById(id: number) {
    return prisma.cuentaContable.findUnique({
      where: { id },
      include: {
        centroCosto: true,
        funcionGasto: true,
        movimientos: {
          take: 20,
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });
  },

  async createCuentaContable(data: CreateCuentaContableDTO, userId: number) {
    await validateCuentaRelacion(data.centroCostoId, data.funcionGastoId);

    try {
      const created = await prisma.cuentaContable.create({
        data,
        include: {
          centroCosto: true,
          funcionGasto: true,
        },
      });

      await prisma.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_CUENTA_CONTABLE",
          data: { cuentaId: created.id, ...data },
        },
      });

      logger.info({ userId, cuentaId: created.id, action: "CREATE_CUENTA_CONTABLE" }, "Cuenta creada");

      return created;
    } catch (error) {
      mapPrismaError(error);
    }
  },

  async updateCuentaContable(id: number, data: UpdateCuentaContableDTO, userId: number) {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as any;
    if (Object.keys(cleanData).length === 0) {
      throw new HttpError("No se enviaron campos para actualizar", 400);
    }

    if (cleanData.centroCostoId !== undefined || cleanData.funcionGastoId !== undefined) {
      const cuentaActual = await prisma.cuentaContable.findUnique({
        where: { id },
        select: { centroCostoId: true, funcionGastoId: true },
      });

      if (!cuentaActual) {
        throw new HttpError("Cuenta contable no encontrada", 404);
      }

      const centroCostoId = cleanData.centroCostoId ?? cuentaActual.centroCostoId;
      const funcionGastoId = cleanData.funcionGastoId ?? cuentaActual.funcionGastoId;
      await validateCuentaRelacion(centroCostoId, funcionGastoId);
    }

    try {
      const updated = await prisma.cuentaContable.update({
        where: { id },
        data: cleanData,
        include: {
          centroCosto: true,
          funcionGasto: true,
        },
      });

      await prisma.log.create({
        data: {
          usuarioId: userId,
          accion: "UPDATE_CUENTA_CONTABLE",
          data: { cuentaId: id, ...cleanData },
        },
      });

      logger.info({ userId, cuentaId: id, action: "UPDATE_CUENTA_CONTABLE" }, "Cuenta actualizada");

      return updated;
    } catch (error) {
      mapPrismaError(error);
    }
  },

  async deleteCuentaContable(id: number, userId: number) {
    const cuenta = await prisma.cuentaContable.findUnique({
      where: { id },
      include: { _count: { select: { movimientos: true } } },
    });

    if (!cuenta) {
      throw new HttpError("Cuenta contable no encontrada", 404);
    }

    if (cuenta._count.movimientos > 0) {
      throw new HttpError("No se puede eliminar: cuenta con movimientos asociados", 409);
    }

    await prisma.cuentaContable.delete({ where: { id } });
    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "DELETE_CUENTA_CONTABLE",
        data: { cuentaId: id },
      },
    });

    logger.info({ userId, cuentaId: id, action: "DELETE_CUENTA_CONTABLE" }, "Cuenta eliminada");
  },
};

