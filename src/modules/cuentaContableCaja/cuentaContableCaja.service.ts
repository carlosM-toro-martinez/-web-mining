import { prisma } from "../../config/prisma.js";
import type {
  CreateCuentaContableCajaDTO,
  UpdateCuentaContableCajaDTO,
} from "./cuentaContableCaja.types.js";
import type { z } from "zod";
import type { cuentaContableCajaQuerySchema } from "./cuentaContableCaja.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type CuentaContableCajaQuery = z.infer<typeof cuentaContableCajaQuerySchema>;

export const cuentaContableCajaService = {
  async getAll(query: CuentaContableCajaQuery) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { nombre: { contains: String(query.search), mode: "insensitive" as const } },
        { codigo: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    if (query.clase) where.clase = query.clase;
    if (query.soloActivas) where.activo = true;

    return prisma.cuentaContableCaja.findMany({ where, orderBy: { codigo: "asc" } });
  },

  async getById(id: number) {
    return prisma.cuentaContableCaja.findUnique({ where: { id } });
  },

  async create(data: CreateCuentaContableCajaDTO, userId: number) {
    const cuenta = await prisma.cuentaContableCaja.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        clase: data.clase,
        nivel: data.nivel,
        monedaCodigo: data.monedaCodigo,
        requiereCentroCosto: data.requiereCentroCosto ?? false,
        requiereFuncionGasto: data.requiereFuncionGasto ?? false,
        activo: data.activo ?? true,
      },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_CUENTA_CONTABLE_CAJA", data: { cuentaId: cuenta.id, ...data } },
    });

    logger.info(
      { userId, cuentaId: cuenta.id, action: "CREATE_CUENTA_CONTABLE_CAJA" },
      "Cuenta contable de caja creada",
    );

    return cuenta;
  },

  async update(id: number, data: UpdateCuentaContableCajaDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const cuenta = await prisma.cuentaContableCaja.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_CUENTA_CONTABLE_CAJA", data: { cuentaId: id, ...cleanData } },
    });

    logger.info(
      { userId, cuentaId: id, action: "UPDATE_CUENTA_CONTABLE_CAJA" },
      "Cuenta contable de caja actualizada",
    );

    return cuenta;
  },

  // Nota: cuando se agregue ConceptoRetencionCaja/GastoCaja, este método
  // debe validar que la cuenta no esté en uso antes de eliminar.
  async remove(id: number, userId: number) {
    const enUso = await prisma.conceptoRetencionCaja.count({ where: { cuentaContableCajaId: id } });
    if (enUso > 0) {
      throw new HttpError(
        "No se puede eliminar: la cuenta está asociada a un concepto de retención",
        409,
      );
    }

    await prisma.cuentaContableCaja.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_CUENTA_CONTABLE_CAJA", data: { cuentaId: id } },
    });

    logger.info(
      { userId, cuentaId: id, action: "DELETE_CUENTA_CONTABLE_CAJA" },
      "Cuenta contable de caja eliminada",
    );
  },
};
