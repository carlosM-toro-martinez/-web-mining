import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import type { CreatePrecioCombustibleDTO } from "./precioCombustible.types.js";
import type { z } from "zod";
import type { precioCombustibleQuerySchema } from "./precioCombustible.schema.js";

type PrecioCombustibleQuery = z.infer<typeof precioCombustibleQuerySchema>;

// Resuelve el precio por litro vigente en una fecha puntual — lo usa
// liquidacion.service.ts para sugerir el monto del concepto marcado
// `esCombustible`, viaje por viaje (el precio puede cambiar de semana a
// semana o de mes a mes).
export async function buscarPrecioCombustibleVigente(fecha: Date) {
  return prisma.precioCombustible.findFirst({
    where: {
      vigenteDesde: { lte: fecha },
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: fecha } }],
    },
    orderBy: { vigenteDesde: "desc" },
  });
}

export const precioCombustibleService = {
  async getAll(query: PrecioCombustibleQuery) {
    const where: any = {};
    if (query.soloVigentes) where.vigenteHasta = null;

    return prisma.precioCombustible.findMany({ where, orderBy: { vigenteDesde: "desc" } });
  },

  async getById(id: number) {
    return prisma.precioCombustible.findUnique({ where: { id } });
  },

  // Igual que TarifaLiquidacion: nunca se edita un registro, crear uno
  // nuevo cierra la vigencia del anterior (el precio del combustible sube/
  // baja de semana a semana o de mes a mes, y hay que poder reconstruir
  // cuál regía en la fecha de cada viaje ya liquidado).
  async create(data: CreatePrecioCombustibleDTO, userId: number) {
    const precio = await prisma.$transaction(async (tx) => {
      await tx.precioCombustible.updateMany({
        where: { vigenteHasta: null },
        data: { vigenteHasta: data.vigenteDesde },
      });

      return tx.precioCombustible.create({ data });
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_PRECIO_COMBUSTIBLE",
        data: { precioId: precio.id, ...data },
      },
    });

    logger.info(
      { userId, precioId: precio.id, action: "CREATE_PRECIO_COMBUSTIBLE" },
      "Precio de combustible creado",
    );

    return precio;
  },
};
