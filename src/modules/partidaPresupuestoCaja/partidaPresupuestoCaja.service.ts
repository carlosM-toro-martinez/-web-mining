import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreatePartidaPresupuestoCajaDTO,
  UpdatePartidaPresupuestoCajaDTO,
} from "./partidaPresupuestoCaja.types.js";
import type { z } from "zod";
import type { partidaPresupuestoCajaQuerySchema } from "./partidaPresupuestoCaja.schema.js";

type PartidaPresupuestoCajaQuery = z.infer<typeof partidaPresupuestoCajaQuerySchema>;

// Por cada partida agrega lo realmente gastado (vía los gastos imputados a
// ella), para poder mostrar "saldo a favor" (presupuestado - gastado) tal
// cual la Planilla de Control de Pagos real.
async function conEjecucion<T extends { id: number; montoPresupuestado: unknown }>(partidas: T[]) {
  const ids = partidas.map((p) => p.id);
  if (ids.length === 0) return [];

  const gastos = await prisma.gastoCaja.groupBy({
    by: ["partidaPresupuestoId"],
    where: { partidaPresupuestoId: { in: ids }, estado: { not: "ANULADO" } },
    _sum: { montoTotal: true },
  });

  const gastadoPorPartida = new Map(gastos.map((g) => [g.partidaPresupuestoId, Number(g._sum.montoTotal ?? 0)]));

  return partidas.map((partida) => {
    const montoPresupuestado = Number(partida.montoPresupuestado);
    const totalGastado = gastadoPorPartida.get(partida.id) ?? 0;
    const saldoAFavor = montoPresupuestado - totalGastado;
    const porcentajeEjecucion = montoPresupuestado > 0 ? (totalGastado / montoPresupuestado) * 100 : 0;
    return { ...partida, totalGastado, saldoAFavor, porcentajeEjecucion };
  });
}

export const partidaPresupuestoCajaService = {
  async getAll(query: PartidaPresupuestoCajaQuery) {
    const where: any = {};
    if (query.cajaId) where.cajaId = query.cajaId;
    if (query.anio) where.anio = query.anio;
    if (query.mes) where.mes = query.mes;
    if (query.soloActivas) where.activo = true;

    const partidas = await prisma.partidaPresupuestoCaja.findMany({
      where,
      include: { caja: true },
      orderBy: [{ anio: "desc" }, { mes: "desc" }, { descripcion: "asc" }],
    });

    return conEjecucion(partidas);
  },

  async getById(id: number) {
    const partida = await prisma.partidaPresupuestoCaja.findUnique({ where: { id }, include: { caja: true } });
    if (!partida) return null;
    const [conDatos] = await conEjecucion([partida]);
    return conDatos;
  },

  async create(data: CreatePartidaPresupuestoCajaDTO, userId: number) {
    const caja = await prisma.cajaChica.findUnique({ where: { id: data.cajaId } });
    if (!caja) throw new HttpError("Caja chica no encontrada", 404);

    const partida = await prisma.partidaPresupuestoCaja.create({
      data: {
        cajaId: data.cajaId,
        anio: data.anio,
        mes: data.mes,
        descripcion: data.descripcion,
        montoPresupuestado: data.montoPresupuestado,
        activo: data.activo ?? true,
      },
      include: { caja: true },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_PARTIDA_PRESUPUESTO_CAJA", data: { partidaId: partida.id, ...data } },
    });
    logger.info(
      { userId, partidaId: partida.id, action: "CREATE_PARTIDA_PRESUPUESTO_CAJA" },
      "Partida de presupuesto creada",
    );

    return partida;
  },

  async update(id: number, data: UpdatePartidaPresupuestoCajaDTO, userId: number) {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as any;

    const partida = await prisma.partidaPresupuestoCaja.update({ where: { id }, data: cleanData, include: { caja: true } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_PARTIDA_PRESUPUESTO_CAJA", data: { partidaId: id, ...cleanData } },
    });
    logger.info(
      { userId, partidaId: id, action: "UPDATE_PARTIDA_PRESUPUESTO_CAJA" },
      "Partida de presupuesto actualizada",
    );

    return partida;
  },

  async remove(id: number, userId: number) {
    const enUso = await prisma.gastoCaja.count({ where: { partidaPresupuestoId: id } });
    if (enUso > 0) {
      throw new HttpError("No se puede eliminar: la partida ya tiene gastos imputados", 409);
    }

    await prisma.partidaPresupuestoCaja.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_PARTIDA_PRESUPUESTO_CAJA", data: { partidaId: id } },
    });
    logger.info(
      { userId, partidaId: id, action: "DELETE_PARTIDA_PRESUPUESTO_CAJA" },
      "Partida de presupuesto eliminada",
    );
  },
};
