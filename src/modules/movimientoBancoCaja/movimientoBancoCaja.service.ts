import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { obtenerSaldoActualCuentaBancaria } from "../cuentaBancariaCaja/cuentaBancariaCaja.service.js";
import { validarNoAnteriorAlCuadre } from "../cuadreSaldo/cuadreSaldo.service.js";
import type { CreateMovimientoBancoCajaDTO, VincularPresupuestoDTO } from "./movimientoBancoCaja.types.js";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { movimientoBancoCajaQuerySchema } from "./movimientoBancoCaja.schema.js";

type MovimientoBancoCajaQuery = z.infer<typeof movimientoBancoCajaQuerySchema>;

const INCLUDE_DETALLE = {
  cuentaBancaria: true,
  caja: true,
  presupuestosAsignados: { select: { id: true, nombre: true, anio: true, mes: true, cajaId: true } },
} as const;

// Un presupuesto lo cubre un solo ingreso: se toma solo si está libre
// (compare-and-swap, por si dos personas lo vinculan a la vez).
async function vincular(tx: Prisma.TransactionClient, presupuestoId: number, movimientoId: string) {
  const presupuesto = await tx.presupuestoCaja.findUnique({ where: { id: presupuestoId } });
  if (!presupuesto) throw new HttpError("Presupuesto (remesa) no encontrado", 404);
  const resultado = await tx.presupuestoCaja.updateMany({
    where: { id: presupuestoId, asignadoMovimientoBancoId: null },
    data: { asignadoMovimientoBancoId: movimientoId, asignadoEn: new Date() },
  });
  if (resultado.count === 0) {
    throw new HttpError(`El presupuesto "${presupuesto.nombre}" ya está vinculado a otro ingreso.`, 409);
  }
}

export const movimientoBancoCajaService = {
  async getAll(query: MovimientoBancoCajaQuery) {
    const where: any = {};
    if (query.cuentaBancariaId) where.cuentaBancariaId = query.cuentaBancariaId;
    if (query.cajaId) where.cajaId = query.cajaId;
    if (query.tipo) where.tipo = query.tipo;
    if (query.fechaInicio || query.fechaFin) {
      where.fecha = {};
      if (query.fechaInicio) where.fecha.gte = query.fechaInicio;
      if (query.fechaFin) where.fecha.lte = query.fechaFin;
    }

    return prisma.movimientoBancoCaja.findMany({ where, include: INCLUDE_DETALLE, orderBy: { fecha: "desc" } });
  },

  // INGRESO: dinero que llega a la cuenta bancaria (presupuesto, sueldos),
  // sin caja destino. SALIDA_A_CAJA: dinero que sale del banco hacia una
  // caja chica (por cheque, con su número, o por transferencia/depósito).
  async create(data: CreateMovimientoBancoCajaDTO, userId: number) {
    const [cuentaBancaria, caja] = await Promise.all([
      prisma.cuentaBancariaCaja.findUnique({ where: { id: data.cuentaBancariaId } }),
      data.cajaId ? prisma.cajaChica.findUnique({ where: { id: data.cajaId } }) : null,
    ]);
    if (!cuentaBancaria) throw new HttpError("Cuenta bancaria no encontrada", 404);
    if (data.cajaId && !caja) throw new HttpError("Caja chica no encontrada", 404);
    await validarNoAnteriorAlCuadre(
      { cuentaBancariaId: data.cuentaBancariaId, fecha: data.fecha },
      "registrar un movimiento del banco",
    );

    if (data.moneda !== cuentaBancaria.monedaBase) {
      throw new HttpError(
        `La cuenta "${cuentaBancaria.nombreCuenta}" es en ${cuentaBancaria.monedaBase}; registra el movimiento en esa moneda.`,
        409,
      );
    }

    if (data.tipo === "SALIDA_A_CAJA") {
      const { saldoActual } = await obtenerSaldoActualCuentaBancaria(data.cuentaBancariaId);
      if (data.monto > saldoActual) {
        throw new HttpError(
          `Fondos insuficientes: la cuenta "${cuentaBancaria.nombreCuenta}" tiene disponible ${saldoActual.toFixed(2)} ${cuentaBancaria.monedaBase} y estás intentando sacar ${data.monto.toFixed(2)}.`,
          409,
        );
      }
    }

    const movimiento = await prisma.$transaction(async (tx) => {
      const creado = await tx.movimientoBancoCaja.create({
        data: {
          cuentaBancariaId: data.cuentaBancariaId,
          tipo: data.tipo,
          cajaId: data.tipo === "SALIDA_A_CAJA" ? (data.cajaId ?? null) : null,
          fecha: data.fecha,
          formaPago: data.formaPago,
          numeroCheque: data.numeroCheque ?? null,
          monto: data.monto,
          moneda: data.moneda,
          depositanteNombre: data.depositanteNombre ?? null,
          descripcion: data.descripcion,
          usuarioId: userId,
        },
      });
      if (data.presupuestoId) await vincular(tx, data.presupuestoId, creado.id);
      return tx.movimientoBancoCaja.findUniqueOrThrow({ where: { id: creado.id }, include: INCLUDE_DETALLE });
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_MOVIMIENTO_BANCO_CAJA",
        data: { movimientoId: movimiento.id, cajaId: data.cajaId, monto: data.monto, presupuestoId: data.presupuestoId },
      },
    });
    logger.info(
      { userId, movimientoId: movimiento.id, action: "CREATE_MOVIMIENTO_BANCO_CAJA" },
      "Movimiento de banco a caja registrado",
    );

    return movimiento;
  },

  // Indica (o cambia, o quita) qué presupuesto cubre un ingreso ya registrado.
  async vincularPresupuesto(id: string, data: VincularPresupuestoDTO, userId: number) {
    const movimiento = await prisma.$transaction(async (tx) => {
      const actual = await tx.movimientoBancoCaja.findUnique({
        where: { id },
        include: { presupuestosAsignados: { select: { id: true } } },
      });
      if (!actual) throw new HttpError("Movimiento no encontrado", 404);
      if (actual.tipo !== "INGRESO") {
        throw new HttpError("Solo un ingreso a la cuenta se puede vincular a un presupuesto", 409);
      }
      if (actual.presupuestosAsignados?.id === data.presupuestoId) {
        return tx.movimientoBancoCaja.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
      }

      if (actual.presupuestosAsignados) {
        await tx.presupuestoCaja.update({
          where: { id: actual.presupuestosAsignados.id },
          data: { asignadoMovimientoBancoId: null, asignadoEn: null },
        });
      }
      if (data.presupuestoId) await vincular(tx, data.presupuestoId, id);

      return tx.movimientoBancoCaja.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "VINCULAR_PRESUPUESTO_MOVIMIENTO_BANCO",
        data: { movimientoId: id, presupuestoId: data.presupuestoId },
      },
    });
    logger.info(
      { userId, movimientoId: id, presupuestoId: data.presupuestoId, action: "VINCULAR_PRESUPUESTO_MOVIMIENTO_BANCO" },
      "Presupuesto vinculado a un ingreso del banco",
    );

    return movimiento;
  },
};
