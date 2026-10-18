import { prisma } from "../../config/prisma.js";
import type { CreateTarifaLiquidacionDTO } from "./tarifaLiquidacion.types.js";
import type { z } from "zod";
import type { tarifaAplicableQuerySchema, tarifaLiquidacionQuerySchema } from "./tarifaLiquidacion.schema.js";
import { buscarTarifaAplicable } from "../liquidacion/liquidacion.service.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type TarifaLiquidacionQuery = z.infer<typeof tarifaLiquidacionQuerySchema>;
type TarifaAplicableQuery = z.infer<typeof tarifaAplicableQuerySchema>;

const INCLUDE_TARIFA = {
  tipoMineral: true,
  transportista: { select: { id: true, nombreORazonSocial: true } },
} as const;

export const tarifaLiquidacionService = {
  // Misma búsqueda (y mismo orden de prioridad) que usa la liquidación real
  // — buscarTarifaAplicable — para poder mostrar "con este transportista, con
  // o sin combustible, se pagaría tanto" sin crear nada.
  async aplicable(query: TarifaAplicableQuery) {
    const transportista = await prisma.transportista.findUnique({ where: { id: query.transportistaId } });
    if (!transportista) throw new HttpError("Transportista no encontrado", 404);

    const tipoMineralId =
      query.tipoMineralId ??
      (await prisma.tipoMineral.findFirst({ where: { activo: true }, orderBy: { id: "asc" } }))?.id;
    if (!tipoMineralId) throw new HttpError("No hay un tipo de mineral registrado", 409);

    const fecha = query.fecha ?? new Date(new Date().toISOString().slice(0, 10));
    const encontrada = await buscarTarifaAplicable(
      transportista.tipoEntidad,
      transportista.id,
      tipoMineralId,
      query.incluyeCombustible,
      fecha,
    );

    const tarifa = encontrada
      ? await prisma.tarifaLiquidacion.findUnique({ where: { id: encontrada.id }, include: INCLUDE_TARIFA })
      : null;
    return { transportista, fecha, tarifa };
  },

  async getAll(query: TarifaLiquidacionQuery) {
    const where: any = {};

    if (query.tipoEntidad) where.tipoEntidad = query.tipoEntidad;
    if (query.transportistaId) where.transportistaId = query.transportistaId;
    if (query.tipoMineralId) where.tipoMineralId = query.tipoMineralId;
    if (query.incluyeCombustible) where.incluyeCombustible = query.incluyeCombustible;
    if (query.soloVigentes) where.vigenteHasta = null;

    return prisma.tarifaLiquidacion.findMany({
      where,
      include: INCLUDE_TARIFA,
      orderBy: { vigenteDesde: "desc" },
    });
  },

  async getById(id: number) {
    return prisma.tarifaLiquidacion.findUnique({ where: { id }, include: INCLUDE_TARIFA });
  },

  // Igual que las alícuotas: nunca se edita, crear una nueva cierra la
  // vigencia anterior para la misma combinación tipoEntidad + transportistaId
  // + tipoMineralId + incluyeCombustible (null en cualquiera de los tres
  // últimos significa "aplica a todos" en esa dimensión). Se cierra solo la
  // vigencia con la MISMA especificidad, para no pisar una tarifa genérica al
  // crear una negociada con un transportista puntual (o viceversa), ni una
  // que no distingue combustible al crear una que sí distingue.
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
          incluyeCombustible: data.incluyeCombustible ?? null,
          vigenteHasta: null,
        },
        data: { vigenteHasta: data.vigenteDesde },
      });

      return tx.tarifaLiquidacion.create({
        data: {
          ...data,
          transportistaId: data.transportistaId ?? null,
          tipoMineralId: data.tipoMineralId ?? null,
          incluyeCombustible: data.incluyeCombustible ?? null,
        },
        include: INCLUDE_TARIFA,
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

  // A diferencia de alícuotas/tarifas de combustible, acá sí se permite
  // borrar de verdad (no solo cerrar la vigencia): el precio aplicado a
  // cada lote ya liquidado queda guardado como una copia en
  // LiquidacionDetalleLote (precioAplicado/subtotal), no como una
  // referencia viva a esta fila — borrar una tarifa mal cargada nunca
  // afecta liquidaciones ya hechas, solo deja de ofrecerse para las futuras.
  async remove(id: number, userId: number) {
    const tarifa = await prisma.tarifaLiquidacion.findUnique({ where: { id } });
    if (!tarifa) throw new HttpError("Tarifa de liquidación no encontrada", 404);

    await prisma.tarifaLiquidacion.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_TARIFA_LIQUIDACION", data: { tarifaId: id } },
    });

    logger.info({ userId, tarifaId: id, action: "DELETE_TARIFA_LIQUIDACION" }, "Tarifa de liquidación eliminada");
  },
};
