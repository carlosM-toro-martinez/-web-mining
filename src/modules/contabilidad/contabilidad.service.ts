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
<<<<<<< HEAD
  CreateSectorDTO,
  UpdateSectorDTO,
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
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

<<<<<<< HEAD
async function validateCuentaRelacion(
  centroCostoId: number,
  funcionGastoId: number,
  sectorId?: number,
) {
  const promises = [
    prisma.centroCosto.findUnique({ where: { id: centroCostoId }, select: { id: true } }),
    prisma.funcionGasto.findUnique({ where: { id: funcionGastoId }, select: { id: true } }),
  ];

  if (sectorId !== undefined) {
    promises.push(prisma.sector.findUnique({ where: { id: sectorId }, select: { id: true } }));
  }

  const [centroCosto, funcionGasto, sector] = (await Promise.all(promises)) as [
    { id: number } | null,
    { id: number } | null,
    { id: number } | null,
  ];
=======
async function validateCuentaRelacion(centroCostoId: number, funcionGastoId: number) {
  const [centroCosto, funcionGasto] = await Promise.all([
    prisma.centroCosto.findUnique({ where: { id: centroCostoId }, select: { id: true } }),
    prisma.funcionGasto.findUnique({ where: { id: funcionGastoId }, select: { id: true } }),
  ]);
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd

  if (!centroCosto) {
    throw new HttpError("Centro de costo no encontrado", 404);
  }

  if (!funcionGasto) {
    throw new HttpError("Función de gasto no encontrada", 404);
  }
<<<<<<< HEAD

  if (sectorId !== undefined && !sector) {
    throw new HttpError("Sector no encontrado", 404);
  }
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
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

<<<<<<< HEAD
  async getSectores() {
    return prisma.sector.findMany({
      include: {
        _count: { select: { cuentas: true } },
      },
      orderBy: [{ codigo: "asc" }],
    });
  },

  async getSectorById(id: number) {
    return prisma.sector.findUnique({
      where: { id },
      include: {
        cuentas: {
          include: { centroCosto: true, funcionGasto: true },
          orderBy: [{ codigoCompleto: "asc" }],
        },
      },
    });
  },

  async createSector(data: CreateSectorDTO, userId: number) {
    try {
      const created = await prisma.sector.create({ data });

      await prisma.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_SECTOR",
          data: { sectorId: created.id, ...data },
        },
      });

      logger.info({ userId, sectorId: created.id, action: "CREATE_SECTOR" }, "Sector creado");

      return created;
    } catch (error) {
      mapPrismaError(error);
    }
  },

  async updateSector(id: number, data: UpdateSectorDTO, userId: number) {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    if (Object.keys(cleanData).length === 0) {
      throw new HttpError("No se enviaron campos para actualizar", 400);
    }

    try {
      const updated = await prisma.sector.update({
        where: { id },
        data: cleanData,
      });

      await prisma.log.create({
        data: {
          usuarioId: userId,
          accion: "UPDATE_SECTOR",
          data: { sectorId: id, ...cleanData },
        },
      });

      logger.info({ userId, sectorId: id, action: "UPDATE_SECTOR" }, "Sector actualizado");

      return updated;
    } catch (error) {
      mapPrismaError(error);
    }
  },

  async deleteSector(id: number, userId: number) {
    const sector = await prisma.sector.findUnique({
      where: { id },
      include: { _count: { select: { cuentas: true } } },
    });

    if (!sector) {
      throw new HttpError("Sector no encontrado", 404);
    }

    if (sector._count.cuentas > 0) {
      throw new HttpError("No se puede eliminar: tiene cuentas contables asociadas", 409);
    }

    await prisma.sector.delete({ where: { id } });
    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "DELETE_SECTOR",
        data: { sectorId: id },
      },
    });

    logger.info({ userId, sectorId: id, action: "DELETE_SECTOR" }, "Sector eliminado");
  },

=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
  async getCuentasContables() {
    return prisma.cuentaContable.findMany({
      include: {
        centroCosto: true,
        funcionGasto: true,
<<<<<<< HEAD
        sector: true,
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
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
<<<<<<< HEAD
        sector: true,
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
        movimientos: {
          take: 20,
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });
  },

  async createCuentaContable(data: CreateCuentaContableDTO, userId: number) {
<<<<<<< HEAD
    await validateCuentaRelacion(data.centroCostoId, data.funcionGastoId, data.sectorId);

    try {
      const createData = {
        codigoCompleto: data.codigoCompleto,
        centroCostoId: data.centroCostoId,
        funcionGastoId: data.funcionGastoId,
        ...(data.sectorId !== undefined ? { sectorId: data.sectorId } : {}),
      };

      const created = await prisma.cuentaContable.create({
        data: createData,
        include: {
          centroCosto: true,
          funcionGasto: true,
          sector: true,
=======
    await validateCuentaRelacion(data.centroCostoId, data.funcionGastoId);

    try {
      const created = await prisma.cuentaContable.create({
        data,
        include: {
          centroCosto: true,
          funcionGasto: true,
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
        },
      });

      await prisma.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_CUENTA_CONTABLE",
          data: { cuentaId: created.id, ...data },
        },
      });

<<<<<<< HEAD
      logger.info(
        { userId, cuentaId: created.id, action: "CREATE_CUENTA_CONTABLE" },
        "Cuenta creada",
      );
=======
      logger.info({ userId, cuentaId: created.id, action: "CREATE_CUENTA_CONTABLE" }, "Cuenta creada");
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd

      return created;
    } catch (error) {
      mapPrismaError(error);
    }
  },

  async updateCuentaContable(id: number, data: UpdateCuentaContableDTO, userId: number) {
<<<<<<< HEAD
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;
=======
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as any;
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
    if (Object.keys(cleanData).length === 0) {
      throw new HttpError("No se enviaron campos para actualizar", 400);
    }

<<<<<<< HEAD
    if (
      cleanData.centroCostoId !== undefined ||
      cleanData.funcionGastoId !== undefined ||
      cleanData.sectorId !== undefined
    ) {
      const cuentaActual = await prisma.cuentaContable.findUnique({
        where: { id },
        select: { centroCostoId: true, funcionGastoId: true, sectorId: true },
=======
    if (cleanData.centroCostoId !== undefined || cleanData.funcionGastoId !== undefined) {
      const cuentaActual = await prisma.cuentaContable.findUnique({
        where: { id },
        select: { centroCostoId: true, funcionGastoId: true },
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
      });

      if (!cuentaActual) {
        throw new HttpError("Cuenta contable no encontrada", 404);
      }

      const centroCostoId = cleanData.centroCostoId ?? cuentaActual.centroCostoId;
      const funcionGastoId = cleanData.funcionGastoId ?? cuentaActual.funcionGastoId;
<<<<<<< HEAD
      const sectorId = cleanData.sectorId ?? cuentaActual.sectorId;
      await validateCuentaRelacion(centroCostoId, funcionGastoId, sectorId);
=======
      await validateCuentaRelacion(centroCostoId, funcionGastoId);
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
    }

    try {
      const updated = await prisma.cuentaContable.update({
        where: { id },
        data: cleanData,
        include: {
          centroCosto: true,
          funcionGasto: true,
<<<<<<< HEAD
          sector: true,
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
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
<<<<<<< HEAD
=======

>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
