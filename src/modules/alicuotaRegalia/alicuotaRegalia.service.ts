import { prisma } from "../../config/prisma.js";
import type { CreateAlicuotaRegaliaDTO } from "./alicuotaRegalia.types.js";
import type { z } from "zod";
import type { alicuotaRegaliaQuerySchema } from "./alicuotaRegalia.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type AlicuotaRegaliaQuery = z.infer<typeof alicuotaRegaliaQuerySchema>;

export const alicuotaRegaliaService = {
  async getAll(query: AlicuotaRegaliaQuery) {
    const where: any = {};

    if (query.municipioOrigenId) where.municipioOrigenId = query.municipioOrigenId;
    if (query.tipoMineralId) where.tipoMineralId = query.tipoMineralId;
    if (query.soloVigentes) where.vigenteHasta = null;

    return prisma.alicuotaRegalia.findMany({
      where,
      include: { municipioOrigen: true, tipoMineral: true },
      orderBy: { vigenteDesde: "desc" },
    });
  },

  async getById(id: number) {
    return prisma.alicuotaRegalia.findUnique({
      where: { id },
      include: { municipioOrigen: true, tipoMineral: true },
    });
  },

  // Una alícuota nunca se edita: crear una nueva cierra automáticamente la
  // vigencia anterior para el mismo municipio + tipo de mineral (conserva el
  // historial completo, igual que el resto del sistema nunca sobrescribe
  // valores fiscales/históricos).
  async create(data: CreateAlicuotaRegaliaDTO, userId: number) {
    const [municipio, tipoMineral] = await Promise.all([
      prisma.municipioOrigen.findUnique({ where: { id: data.municipioOrigenId } }),
      prisma.tipoMineral.findUnique({ where: { id: data.tipoMineralId } }),
    ]);
    if (!municipio) throw new HttpError("Municipio de origen no encontrado", 404);
    if (!tipoMineral) throw new HttpError("Tipo de mineral no encontrado", 404);

    const alicuota = await prisma.$transaction(async (tx) => {
      await tx.alicuotaRegalia.updateMany({
        where: {
          municipioOrigenId: data.municipioOrigenId,
          tipoMineralId: data.tipoMineralId,
          vigenteHasta: null,
        },
        data: { vigenteHasta: data.vigenteDesde },
      });

      return tx.alicuotaRegalia.create({
        data,
        include: { municipioOrigen: true, tipoMineral: true },
      });
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_ALICUOTA_REGALIA",
        data: { alicuotaId: alicuota.id, ...data },
      },
    });

    logger.info(
      { userId, alicuotaId: alicuota.id, action: "CREATE_ALICUOTA_REGALIA" },
      "Alícuota de regalía creada",
    );

    return alicuota;
  },
};
