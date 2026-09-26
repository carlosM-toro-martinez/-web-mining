import { prisma } from "../../config/prisma.js";
import type { CreateTarifaLiquidacionDTO } from "./tarifaLiquidacion.types.js";
import type { z } from "zod";
import type { tarifaLiquidacionQuerySchema } from "./tarifaLiquidacion.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type TarifaLiquidacionQuery = z.infer<typeof tarifaLiquidacionQuerySchema>;

export const tarifaLiquidacionService = {
  async getAll(query: TarifaLiquidacionQuery) {
    const where: any = {};

    if (query.tipoEntidad) where.tipoEntidad = query.tipoEntidad;
    if (query.transportistaId) where.transportistaId = query.transportistaId;
    if (query.tipoMineralId) where.tipoMineralId = query.tipoMineralId;
    if (query.soloVigentes) where.vigenteHasta = null;

    return prisma.tarifaLiquidacion.findMany({
      where,
      include: { tipoMineral: true },
      orderBy: { vigenteDesde: "desc" },
    });
  },

  async getById(id: number) {
    return prisma.tarifaLiquidacion.findUnique({ where: { id }, include: { tipoMineral: true } });
  },

  // Igual que las alícuotas: nunca se edita, crear una nueva cierra la
  // vigencia anterior para la misma combinación tipoEntidad + transportistaId
  // + tipoMineralId (null en cualquiera de los dos últimos significa
  // "aplica a todos" en esa dimensión). Se cierra solo la vigencia con la
  // MISMA especificidad, para no pisar una tarifa genérica al crear una
  // negociada con un transportista puntual (o viceversa).
  async create(data: CreateTarifaLiquidacionDTO, userId: number) {
    if (data.tipoMineralId) {
      const tipoMineral = await prisma.tipoMineral.findUnique({ where: { id: data.tipoMineralId } });
      if (!tipoMineral) throw new HttpError("Tipo de mineral no encontrado", 404);
    }

    if (data.transportistaId) {
      const transportista = await prisma.transportista.findUnique({ where: { id: data.transportistaId } });
      if (!transportista) throw new HttpError("Transportista no encontrado", 404);
    }

    const tarifa = await prisma.$transaction(async (tx) => {
      await tx.tarifaLiquidacion.updateMany({
        where: {
          tipoEntidad: data.tipoEntidad,
          transportistaId: data.transportistaId ?? null,
          tipoMineralId: data.tipoMineralId ?? null,
          vigenteHasta: null,
        },
        data: { vigenteHasta: data.vigenteDesde },
      });

      return tx.tarifaLiquidacion.create({
        data: { ...data, transportistaId: data.transportistaId ?? null, tipoMineralId: data.tipoMineralId ?? null },
        include: { tipoMineral: true },
      });
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_TARIFA_LIQUIDACION",
        data: { tarifaId: tarifa.id, ...data },
      },
    });

    logger.info(
      { userId, tarifaId: tarifa.id, action: "CREATE_TARIFA_LIQUIDACION" },
      "Tarifa de liquidación creada",
    );

    return tarifa;
  },
};
