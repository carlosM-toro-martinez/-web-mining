import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  AsignarBancoPresupuestoCajaDTO,
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
  asignadoMovimientoBanco: { include: { cuentaBancaria: true } },
} as const;

// Agrega a cada remesa el total presupuestado (suma de sus partidas), lo
// realmente gastado (vía los gastos imputados a esas partidas) y el saldo a
// favor — mismo cálculo que partidaPresupuestoCaja.service, pero sumado a
// nivel de remesa completa.
async function conEjecucion<T extends { id: number; partidas: Array<{ id: number; montoPresupuestado: unknown }> }>(
  presupuestos: T[],
) {
  const partidaIds = presupuestos.flatMap((p) => p.partidas.map((d) => d.id));
  if (partidaIds.length === 0) {
    return presupuestos.map((p) => ({ ...p, totalPresupuestado: 0, totalGastado: 0, saldoAFavor: 0, porcentajeEjecucion: 0 }));
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
    return { ...presupuesto, totalPresupuestado, totalGastado, saldoAFavor, porcentajeEjecucion };
  });
}

export const presupuestoCajaService = {
  async getAll(query: PresupuestoCajaQuery) {
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

    if (presupuesto.asignadoMovimientoBancoId) {
      throw new HttpError("No se puede eliminar: esta remesa ya fue aprobada y asignada al banco.", 409);
    }

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

  // Aprueba la remesa y la asigna a una cuenta bancaria de una sola vez: crea
  // el ingreso por el total de sus partidas y deja la remesa marcada como
  // asignada, para que el botón no se pueda volver a presionar (compare-and-
  // swap con updateMany, igual que el cierre de rendiciones).
  async asignarBanco(id: number, data: AsignarBancoPresupuestoCajaDTO, userId: number) {
    const presupuesto = await prisma.presupuestoCaja.findUnique({ where: { id }, include: { partidas: true } });
    if (!presupuesto) throw new HttpError("Presupuesto (remesa) no encontrado", 404);
    if (presupuesto.asignadoMovimientoBancoId) {
      throw new HttpError("Esta remesa ya fue aprobada y asignada al banco.", 409);
    }

    const cuentaBancaria = await prisma.cuentaBancariaCaja.findUnique({ where: { id: data.cuentaBancariaId } });
    if (!cuentaBancaria) throw new HttpError("Cuenta bancaria no encontrada", 404);

    const total = presupuesto.partidas.reduce((acc, p) => acc + Number(p.montoPresupuestado), 0);
    if (total <= 0) throw new HttpError("Esta remesa no tiene partidas con monto para asignar.", 400);

    const actualizado = await prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimientoBancoCaja.create({
        data: {
          cuentaBancariaId: cuentaBancaria.id,
          tipo: "INGRESO",
          fecha: new Date(),
          formaPago: "DEPOSITO",
          monto: total,
          moneda: cuentaBancaria.monedaBase,
          descripcion: `Presupuesto aprobado y asignado — ${presupuesto.nombre}`,
          usuarioId: userId,
        },
      });

      // Compare-and-swap: si otra petición ya asignó esta remesa entre el
      // findUnique de arriba y este update, el where deja de matchear y
      // count sale en 0 — así el botón nunca puede duplicar el ingreso.
      const resultado = await tx.presupuestoCaja.updateMany({
        where: { id, asignadoMovimientoBancoId: null },
        data: { asignadoMovimientoBancoId: movimiento.id, asignadoEn: new Date() },
      });
      if (resultado.count === 0) {
        throw new HttpError("Esta remesa ya fue aprobada y asignada al banco.", 409);
      }

      return tx.presupuestoCaja.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "ASIGNAR_BANCO_PRESUPUESTO_CAJA", data: { presupuestoId: id, monto: total } },
    });
    logger.info(
      { userId, presupuestoId: id, action: "ASIGNAR_BANCO_PRESUPUESTO_CAJA" },
      "Remesa aprobada y asignada al banco",
    );

    const [conDatos] = await conEjecucion([actualizado]);
    return conDatos;
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
