import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type { CreateCuentaBancariaCajaDTO, UpdateCuentaBancariaCajaDTO } from "./cuentaBancariaCaja.types.js";
import type { z } from "zod";
import type { cuentaBancariaCajaQuerySchema } from "./cuentaBancariaCaja.schema.js";

type CuentaBancariaCajaQuery = z.infer<typeof cuentaBancariaCajaQuerySchema>;

// Saldo actual = saldo inicial declarado + ingresos registrados - salidas
// hacia cajas - gastos pagados directo desde esta cuenta (sin pasar por
// ninguna caja). Se calcula al vuelo, nunca se guarda como número fijo.
async function conSaldo<T extends { id: number; saldoInicial: unknown }>(cuentas: T[]) {
  const ids = cuentas.map((c) => c.id);
  if (ids.length === 0) return [];

  const [movimientos, gastosDirectos] = await Promise.all([
    prisma.movimientoBancoCaja.groupBy({
      by: ["cuentaBancariaId", "tipo"],
      where: { cuentaBancariaId: { in: ids } },
      _sum: { monto: true },
    }),
    prisma.gastoCaja.groupBy({
      by: ["cuentaBancariaCajaId"],
      where: { cuentaBancariaCajaId: { in: ids }, estado: { not: "ANULADO" } },
      _sum: { montoTotal: true },
    }),
  ]);

  const totalesPorCuenta = new Map<number, { ingresos: number; salidas: number; gastos: number }>();
  for (const m of movimientos) {
    const actual = totalesPorCuenta.get(m.cuentaBancariaId) ?? { ingresos: 0, salidas: 0, gastos: 0 };
    if (m.tipo === "INGRESO") actual.ingresos += Number(m._sum.monto ?? 0);
    else actual.salidas += Number(m._sum.monto ?? 0);
    totalesPorCuenta.set(m.cuentaBancariaId, actual);
  }
  for (const g of gastosDirectos) {
    if (g.cuentaBancariaCajaId === null) continue;
    const actual = totalesPorCuenta.get(g.cuentaBancariaCajaId) ?? { ingresos: 0, salidas: 0, gastos: 0 };
    actual.gastos += Number(g._sum.montoTotal ?? 0);
    totalesPorCuenta.set(g.cuentaBancariaCajaId, actual);
  }

  return cuentas.map((cuenta) => {
    const totales = totalesPorCuenta.get(cuenta.id) ?? { ingresos: 0, salidas: 0, gastos: 0 };
    const saldoActual = Number(cuenta.saldoInicial) + totales.ingresos - totales.salidas - totales.gastos;
    return { ...cuenta, totalIngresos: totales.ingresos, totalSalidas: totales.salidas, saldoActual };
  });
}

// Para chequeos de un solo id (validar fondos antes de una salida o un
// gasto directo del banco) — misma fórmula que conSaldo(), sin traer todas
// las cuentas.
export async function obtenerSaldoActualCuentaBancaria(cuentaBancariaId: number) {
  const cuenta = await prisma.cuentaBancariaCaja.findUnique({ where: { id: cuentaBancariaId } });
  if (!cuenta) throw new HttpError("Cuenta bancaria no encontrada", 404);
  const [conDatos] = await conSaldo([cuenta]);
  return { cuenta, saldoActual: conDatos!.saldoActual };
}

export const cuentaBancariaCajaService = {
  async getAll(query: CuentaBancariaCajaQuery) {
    const where: any = {};
    if (query.soloActivas) where.activo = true;

    const cuentas = await prisma.cuentaBancariaCaja.findMany({ where, orderBy: { banco: "asc" } });
    return conSaldo(cuentas);
  },

  async getById(id: number) {
    const cuenta = await prisma.cuentaBancariaCaja.findUnique({ where: { id } });
    if (!cuenta) return null;
    const [conDatos] = await conSaldo([cuenta]);
    return conDatos;
  },

  async create(data: CreateCuentaBancariaCajaDTO, userId: number) {
    const cuenta = await prisma.cuentaBancariaCaja.create({
      data: {
        banco: data.banco,
        numeroCuenta: data.numeroCuenta ?? null,
        nombreCuenta: data.nombreCuenta,
        monedaBase: data.monedaBase ?? "BOB",
        saldoInicial: data.saldoInicial ?? 0,
        activo: data.activo ?? true,
      },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_CUENTA_BANCARIA_CAJA", data: { cuentaId: cuenta.id, ...data } },
    });
    logger.info({ userId, cuentaId: cuenta.id, action: "CREATE_CUENTA_BANCARIA_CAJA" }, "Cuenta bancaria creada");

    return cuenta;
  },

  async update(id: number, data: UpdateCuentaBancariaCajaDTO, userId: number) {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as any;

    const cuenta = await prisma.cuentaBancariaCaja.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_CUENTA_BANCARIA_CAJA", data: { cuentaId: id, ...cleanData } },
    });
    logger.info({ userId, cuentaId: id, action: "UPDATE_CUENTA_BANCARIA_CAJA" }, "Cuenta bancaria actualizada");

    return cuenta;
  },

  async remove(id: number, userId: number) {
    const [movimientos, gastosDirectos] = await Promise.all([
      prisma.movimientoBancoCaja.count({ where: { cuentaBancariaId: id } }),
      prisma.gastoCaja.count({ where: { cuentaBancariaCajaId: id } }),
    ]);
    if (movimientos + gastosDirectos > 0) {
      throw new HttpError("No se puede eliminar: la cuenta bancaria tiene movimientos o gastos registrados", 409);
    }

    await prisma.cuentaBancariaCaja.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_CUENTA_BANCARIA_CAJA", data: { cuentaId: id } },
    });
    logger.info({ userId, cuentaId: id, action: "DELETE_CUENTA_BANCARIA_CAJA" }, "Cuenta bancaria eliminada");
  },
};
