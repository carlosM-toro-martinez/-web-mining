import { prisma } from "../../config/prisma.js";
import type {
  CreateConceptoRetencionCajaDTO,
  UpdateConceptoRetencionCajaDTO,
} from "./conceptoRetencionCaja.types.js";
import type { z } from "zod";
import type { conceptoRetencionCajaQuerySchema } from "./conceptoRetencionCaja.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type ConceptoRetencionCajaQuery = z.infer<typeof conceptoRetencionCajaQuerySchema>;

export const conceptoRetencionCajaService = {
  async getAll(query: ConceptoRetencionCajaQuery) {
    const where: any = {};
    if (query.soloActivos) where.activo = true;

    return prisma.conceptoRetencionCaja.findMany({
      where,
      include: { cuentaContableCaja: true },
      orderBy: { codigo: "asc" },
    });
  },

  async getById(id: number) {
    return prisma.conceptoRetencionCaja.findUnique({
      where: { id },
      include: { cuentaContableCaja: true },
    });
  },

  async create(data: CreateConceptoRetencionCajaDTO, userId: number) {
    const cuenta = await prisma.cuentaContableCaja.findUnique({
      where: { id: data.cuentaContableCajaId },
    });
    if (!cuenta) throw new HttpError("Cuenta contable no encontrada", 404);

    const concepto = await prisma.conceptoRetencionCaja.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        porcentaje: data.porcentaje,
        cuentaContableCajaId: data.cuentaContableCajaId,
        activo: data.activo ?? true,
      },
      include: { cuentaContableCaja: true },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_CONCEPTO_RETENCION_CAJA",
        data: { conceptoId: concepto.id, ...data },
      },
    });

    logger.info(
      { userId, conceptoId: concepto.id, action: "CREATE_CONCEPTO_RETENCION_CAJA" },
      "Concepto de retención creado",
    );

    return concepto;
  },

  async update(id: number, data: UpdateConceptoRetencionCajaDTO, userId: number) {
    if (data.cuentaContableCajaId !== undefined) {
      const cuenta = await prisma.cuentaContableCaja.findUnique({
        where: { id: data.cuentaContableCajaId },
      });
      if (!cuenta) throw new HttpError("Cuenta contable no encontrada", 404);
    }

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const concepto = await prisma.conceptoRetencionCaja.update({
      where: { id },
      data: cleanData,
      include: { cuentaContableCaja: true },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_CONCEPTO_RETENCION_CAJA",
        data: { conceptoId: id, ...cleanData },
      },
    });

    logger.info(
      { userId, conceptoId: id, action: "UPDATE_CONCEPTO_RETENCION_CAJA" },
      "Concepto de retención actualizado",
    );

    return concepto;
  },
};
