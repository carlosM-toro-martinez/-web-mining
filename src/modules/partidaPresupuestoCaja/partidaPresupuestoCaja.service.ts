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

const INCLUDE_PRESUPUESTO = { presupuesto: { include: { caja: true } } } as const;

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

// La partida vive bajo una remesa (PresupuestoCaja), que a su vez pertenece
// a una caja — para no romper a nadie que ya esperaba `partida.caja`
// (exports de Excel/PDF, etc.), se "aplana" la caja de la remesa aquí mismo.
function conCajaAplanada<T extends { presupuesto?: { caja: unknown } | null }>(partida: T) {
  const { presupuesto, ...resto } = partida;
  return { ...resto, presupuesto, caja: presupuesto?.caja ?? null };
}

export const partidaPresupuestoCajaService = {
  async getAll(query: PartidaPresupuestoCajaQuery) {
    const where: any = {};
    if (query.presupuestoId) where.presupuestoId = query.presupuestoId;
    if (query.cajaId || query.anio || query.mes || query.soloActivas) {
      where.presupuesto = {};
      if (query.cajaId) where.presupuesto.cajaId = query.cajaId;
      if (query.anio) where.presupuesto.anio = query.anio;
      if (query.mes) where.presupuesto.mes = query.mes;
      if (query.soloActivas) where.presupuesto.activo = true;
    }

    const partidas = await prisma.partidaPresupuestoCaja.findMany({
      where,
      include: INCLUDE_PRESUPUESTO,
      orderBy: [{ presupuesto: { anio: "desc" } }, { presupuesto: { mes: "desc" } }, { descripcion: "asc" }],
    });

    const conDatos = await conEjecucion(partidas);
    return conDatos.map(conCajaAplanada);
  },

  async getById(id: number) {
    const partida = await prisma.partidaPresupuestoCaja.findUnique({ where: { id }, include: INCLUDE_PRESUPUESTO });
    if (!partida) return null;
    const [conDatos] = await conEjecucion([partida]);
    return conCajaAplanada(conDatos!);
  },

  async create(data: CreatePartidaPresupuestoCajaDTO, userId: number) {
    const presupuesto = await prisma.presupuestoCaja.findUnique({ where: { id: data.presupuestoId } });
    if (!presupuesto) throw new HttpError("Presupuesto (remesa) no encontrado", 404);

    const partida = await prisma.partidaPresupuestoCaja.create({
      data: {
        presupuestoId: data.presupuestoId,
        descripcion: data.descripcion,
        montoPresupuestado: data.montoPresupuestado,
        centroCostoCajaId: data.centroCostoCajaId ?? null,
        funcionGastoCajaId: data.funcionGastoCajaId ?? null,
        cuentaContableCajaId: data.cuentaContableCajaId ?? null,
        categoriaRendicion: data.categoriaRendicion ?? null,
        activo: data.activo ?? true,
      },
      include: INCLUDE_PRESUPUESTO,
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_PARTIDA_PRESUPUESTO_CAJA", data: { partidaId: partida.id, ...data } },
    });
    logger.info(
      { userId, partidaId: partida.id, action: "CREATE_PARTIDA_PRESUPUESTO_CAJA" },
      "Partida de presupuesto creada",
    );

    return conCajaAplanada(partida);
  },

  async update(id: number, data: UpdatePartidaPresupuestoCajaDTO, userId: number) {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as any;

    const partida = await prisma.partidaPresupuestoCaja.update({
      where: { id },
      data: cleanData,
      include: INCLUDE_PRESUPUESTO,
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_PARTIDA_PRESUPUESTO_CAJA", data: { partidaId: id, ...cleanData } },
    });
    logger.info(
      { userId, partidaId: id, action: "UPDATE_PARTIDA_PRESUPUESTO_CAJA" },
      "Partida de presupuesto actualizada",
    );

    return conCajaAplanada(partida);
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
