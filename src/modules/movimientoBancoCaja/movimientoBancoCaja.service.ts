import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { obtenerSaldoActualCuentaBancaria } from "../cuentaBancariaCaja/cuentaBancariaCaja.service.js";
import type { CreateMovimientoBancoCajaDTO } from "./movimientoBancoCaja.types.js";
import type { z } from "zod";
import type { movimientoBancoCajaQuerySchema } from "./movimientoBancoCaja.schema.js";

type MovimientoBancoCajaQuery = z.infer<typeof movimientoBancoCajaQuerySchema>;

const INCLUDE_DETALLE = {
  cuentaBancaria: true,
  caja: true,
} as const;

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

    const movimiento = await prisma.movimientoBancoCaja.create({
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
      include: INCLUDE_DETALLE,
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_MOVIMIENTO_BANCO_CAJA",
        data: { movimientoId: movimiento.id, cajaId: data.cajaId, monto: data.monto },
      },
    });
    logger.info(
      { userId, movimientoId: movimiento.id, action: "CREATE_MOVIMIENTO_BANCO_CAJA" },
      "Movimiento de banco a caja registrado",
    );

    return movimiento;
  },
};
