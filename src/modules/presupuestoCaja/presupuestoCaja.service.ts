import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreatePresupuestoCajaDTO,
  DuplicarPresupuestoCajaDTO,
  UpdatePresupuestoCajaDTO,
} from "./presupuestoCaja.types.js";
import type { z } from "zod";
import type { presupuestoCajaQuerySchema } from "./presupuestoCaja.schema.js";

type PresupuestoCajaQuery = z.infer<typeof presupuestoCajaQuerySchema>;

const INCLUDE_DETALLE = {
  caja: true,
  partidas: { orderBy: { descripcion: "asc" as const } },
  // Ingresos del banco que trajeron la remesa (puede llegar en partes).
  ingresos: {
    where: { anulado: false },
    include: { cuentaBancaria: true },
    orderBy: { fecha: "asc" as const },
  },
} as const;

const MENSAJE_CON_INGRESOS =
  "esta remesa ya tiene ingresos del banco vinculados (desvincúlalos en Saldos para cambiarla).";

// "Otros gastos": la remesa que existe sola en cada mes para los gastos que no
// estaban presupuestados. Se crea al consultar un mes (no hay que crearla a
// mano cada mes) y no recibe dinero del banco.
const NOMBRE_REMESA_POR_DEFECTO = "OTROS GASTOS";
const PARTIDA_POR_DEFECTO = "Gastos adicionales";
const MONTO_PARTIDA_POR_DEFECTO = 100000;

// El mes actual en Bolivia (el servidor puede estar en otra zona horaria).
function mesActualBolivia() {
  const [anio, mes] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  return { anio: anio!, mes: mes! };
}

async function asegurarRemesaPorDefecto(cajaId: number, anio: number, mes: number) {
  const existe = () => prisma.presupuestoCaja.findFirst({ where: { cajaId, anio, mes, esPorDefecto: true }, select: { id: true } });
  if (await existe()) return;

  // No se crea hacia atrás de lo que la caja ya tiene (navegar a un mes viejo no llena de remesas),
  // ni más allá del mes que viene.
  const actual = mesActualBolivia();
  const clave = anio * 12 + mes;
  if (clave > actual.anio * 12 + actual.mes + 1) return;
  const [primerPresupuesto, primerGasto] = await Promise.all([
    prisma.presupuestoCaja.findFirst({ where: { cajaId }, orderBy: [{ anio: "asc" }, { mes: "asc" }], select: { anio: true, mes: true } }),
    prisma.gastoCaja.findFirst({ where: { cajaId }, orderBy: { fecha: "asc" }, select: { fecha: true } }),
  ]);
  const inicios = [
    primerPresupuesto ? primerPresupuesto.anio * 12 + primerPresupuesto.mes : null,
    primerGasto ? primerGasto.fecha.getUTCFullYear() * 12 + primerGasto.fecha.getUTCMonth() + 1 : null,
  ].filter((v): v is number => v !== null);
  if (clave < Math.min(actual.anio * 12 + actual.mes, ...inicios)) return;

  await prisma.$transaction(async (tx) => {
    // Dos consultas a la vez no deben crear dos remesas.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${cajaId * 1000000 + anio * 100 + mes})`;
    const ya = await tx.presupuestoCaja.findFirst({ where: { cajaId, anio, mes, esPorDefecto: true }, select: { id: true } });
    if (ya) return;
    const creada = await tx.presupuestoCaja.create({
      data: { cajaId, anio, mes, nombre: NOMBRE_REMESA_POR_DEFECTO, esPorDefecto: true, activo: true },
    });
    await tx.partidaPresupuestoCaja.create({
      data: { presupuestoId: creada.id, descripcion: PARTIDA_POR_DEFECTO, montoPresupuestado: MONTO_PARTIDA_POR_DEFECTO, activo: true },
    });
    logger.info({ presupuestoId: creada.id, cajaId, anio, mes, action: "CREATE_REMESA_POR_DEFECTO" }, "Remesa 'otros gastos' creada");
  });
}

// Asegura la remesa "otros gastos" del mes pedido (o del actual) en la caja
// pedida (o en todas las cajas activas).
export async function asegurarRemesasPorDefecto(opciones: { cajaId?: number | undefined; anio?: number | undefined; mes?: number | undefined }) {
  const actual = mesActualBolivia();
  const anio = opciones.anio ?? actual.anio;
  const mes = opciones.mes ?? actual.mes;
  if (mes < 1 || mes > 12) return;
  const cajas = opciones.cajaId
    ? [{ id: opciones.cajaId }]
    : await prisma.cajaChica.findMany({ where: { activo: true }, select: { id: true } });
  for (const c of cajas) await asegurarRemesaPorDefecto(c.id, anio, mes);
}

export async function remesaTieneIngresos(presupuestoId: number) {
  return (await prisma.movimientoBancoCaja.count({ where: { presupuestoId, anulado: false } })) > 0;
}

// Agrega a cada remesa el total presupuestado (suma de sus partidas), lo
// realmente gastado (vía los gastos imputados a esas partidas) y el saldo a
// favor — mismo cálculo que partidaPresupuestoCaja.service, pero sumado a
// nivel de remesa completa.
async function conEjecucion<
  T extends {
    id: number;
    partidas: Array<{ id: number; montoPresupuestado: unknown }>;
    ingresos: Array<{ monto: unknown }>;
  },
>(presupuestos: T[]) {
  const recibido = (p: T) => p.ingresos.reduce((acc, i) => acc + Number(i.monto), 0);
  const partidaIds = presupuestos.flatMap((p) => p.partidas.map((d) => d.id));
  if (partidaIds.length === 0) {
    return presupuestos.map((p) => ({
      ...p,
      totalPresupuestado: 0,
      totalGastado: 0,
      saldoAFavor: 0,
      porcentajeEjecucion: 0,
      totalRecibido: recibido(p),
    }));
  }

  const gastos = await prisma.gastoCaja.groupBy({
    by: ["partidaPresupuestoId"],
    where: { partidaPresupuestoId: { in: partidaIds }, estado: { not: "ANULADO" } },
    _sum: { montoTotal: true },
  });
  const gastadoPorPartida = new Map(gastos.map((g) => [g.partidaPresupuestoId, Number(g._sum.montoTotal ?? 0)]));

  return presupuestos.map((presupuesto) => {
    const totalPresupuestado = presupuesto.partidas.reduce((acc, d) => acc + Number(d.montoPresupuestado), 0);
    const totalGastado = presupuesto.partidas.reduce((acc, d) => acc + (gastadoPorPartida.get(d.id) ?? 0), 0);
    const saldoAFavor = totalPresupuestado - totalGastado;
    const porcentajeEjecucion = totalPresupuestado > 0 ? (totalGastado / totalPresupuestado) * 100 : 0;
    return { ...presupuesto, totalPresupuestado, totalGastado, saldoAFavor, porcentajeEjecucion, totalRecibido: recibido(presupuesto) };
  });
}

export const presupuestoCajaService = {
  async getAll(query: PresupuestoCajaQuery) {
    // Al mirar un mes, su remesa "otros gastos" ya existe.
    if (query.anio && query.mes) await asegurarRemesasPorDefecto({ cajaId: query.cajaId, anio: query.anio, mes: query.mes });
    const where: any = {};
    if (query.cajaId) where.cajaId = query.cajaId;
    if (query.anio) where.anio = query.anio;
    if (query.mes) where.mes = query.mes;
    if (query.soloActivas) where.activo = true;

    const presupuestos = await prisma.presupuestoCaja.findMany({
      where,
      include: INCLUDE_DETALLE,
      orderBy: [{ anio: "desc" }, { mes: "desc" }, { nombre: "asc" }],
    });

    return conEjecucion(presupuestos);
  },

  async getById(id: number) {
    const presupuesto = await prisma.presupuestoCaja.findUnique({ where: { id }, include: INCLUDE_DETALLE });
    if (!presupuesto) return null;
    const [conDatos] = await conEjecucion([presupuesto]);
    return conDatos;
  },

  async create(data: CreatePresupuestoCajaDTO, userId: number) {
    const caja = await prisma.cajaChica.findUnique({ where: { id: data.cajaId } });
    if (!caja) throw new HttpError("Caja chica no encontrada", 404);

    const presupuesto = await prisma.presupuestoCaja.create({
      data: {
        cajaId: data.cajaId,
        anio: data.anio,
        mes: data.mes,
        nombre: data.nombre,
        activo: data.activo ?? true,
      },
      include: INCLUDE_DETALLE,
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_PRESUPUESTO_CAJA", data: { presupuestoId: presupuesto.id, ...data } },
    });
    logger.info({ userId, presupuestoId: presupuesto.id, action: "CREATE_PRESUPUESTO_CAJA" }, "Presupuesto (remesa) creado");

    const [conDatos] = await conEjecucion([presupuesto]);
    return conDatos;
  },

  async update(id: number, data: UpdatePresupuestoCajaDTO, userId: number) {
    const existente = await prisma.presupuestoCaja.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Presupuesto (remesa) no encontrado", 404);
    if (existente.esPorDefecto && (data.nombre !== undefined || data.activo !== undefined)) {
      throw new HttpError('"Otros gastos" existe siempre en cada mes: no se puede renombrar ni desactivar.', 409);
    }
    if (await remesaTieneIngresos(id)) throw new HttpError(`No se puede editar: ${MENSAJE_CON_INGRESOS}`, 409);

    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as any;

    const presupuesto = await prisma.presupuestoCaja.update({ where: { id }, data: cleanData, include: INCLUDE_DETALLE });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_PRESUPUESTO_CAJA", data: { presupuestoId: id, ...cleanData } },
    });
    logger.info({ userId, presupuestoId: id, action: "UPDATE_PRESUPUESTO_CAJA" }, "Presupuesto (remesa) actualizado");

    const [conDatos] = await conEjecucion([presupuesto]);
    return conDatos;
  },

  async remove(id: number, userId: number) {
    const presupuesto = await prisma.presupuestoCaja.findUnique({ where: { id }, include: { partidas: true } });
    if (!presupuesto) throw new HttpError("Presupuesto (remesa) no encontrado", 404);

    if (presupuesto.esPorDefecto) {
      throw new HttpError('"Otros gastos" existe siempre en cada mes: no se puede eliminar.', 409);
    }
    if (await remesaTieneIngresos(id)) throw new HttpError(`No se puede eliminar: ${MENSAJE_CON_INGRESOS}`, 409);
    // Los ingresos anulados que la nombraban se sueltan antes de borrarla.
    await prisma.movimientoBancoCaja.updateMany({ where: { presupuestoId: id }, data: { presupuestoId: null } });

    const partidaIds = presupuesto.partidas.map((p) => p.id);
    const enUso = partidaIds.length
      ? await prisma.gastoCaja.count({ where: { partidaPresupuestoId: { in: partidaIds } } })
      : 0;
    if (enUso > 0) {
      throw new HttpError("No se puede eliminar: alguna de sus partidas ya tiene gastos imputados", 409);
    }

    await prisma.$transaction([
      prisma.partidaPresupuestoCaja.deleteMany({ where: { presupuestoId: id } }),
      prisma.presupuestoCaja.delete({ where: { id } }),
    ]);

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_PRESUPUESTO_CAJA", data: { presupuestoId: id } },
    });
    logger.info({ userId, presupuestoId: id, action: "DELETE_PRESUPUESTO_CAJA" }, "Presupuesto (remesa) eliminado");
  },

  // Usa una remesa existente (de cualquier mes) como plantilla: clona su
  // nombre (o el que se pase) y todas sus partidas (misma descripción y
  // monto) hacia un nuevo mes/año, lista para ajustar montos si hace falta.
  async duplicar(id: number, data: DuplicarPresupuestoCajaDTO, userId: number) {
    const original = await prisma.presupuestoCaja.findUnique({ where: { id }, include: { partidas: true } });
    if (!original) throw new HttpError("Presupuesto (remesa) no encontrado", 404);

    const cajaId = data.cajaId ?? original.cajaId;
    const caja = await prisma.cajaChica.findUnique({ where: { id: cajaId } });
    if (!caja) throw new HttpError("Caja chica no encontrada", 404);

    const nuevo = await prisma.$transaction(async (tx) => {
      const creado = await tx.presupuestoCaja.create({
        data: {
          cajaId,
          anio: data.anio,
          mes: data.mes,
          nombre: data.nombre ?? original.nombre,
          activo: true,
        },
      });

      if (original.partidas.length > 0) {
        await tx.partidaPresupuestoCaja.createMany({
          data: original.partidas.map((p) => ({
            presupuestoId: creado.id,
            descripcion: p.descripcion,
            montoPresupuestado: p.montoPresupuestado,
            activo: true,
          })),
        });
      }

      return tx.presupuestoCaja.findUniqueOrThrow({ where: { id: creado.id }, include: INCLUDE_DETALLE });
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "DUPLICAR_PRESUPUESTO_CAJA",
        data: { presupuestoOrigenId: id, presupuestoNuevoId: nuevo.id, partidas: original.partidas.length },
      },
    });
    logger.info(
      { userId, presupuestoOrigenId: id, presupuestoNuevoId: nuevo.id, action: "DUPLICAR_PRESUPUESTO_CAJA" },
      "Presupuesto (remesa) duplicado como plantilla",
    );

    const [conDatos] = await conEjecucion([nuevo]);
    return conDatos;
  },
};
