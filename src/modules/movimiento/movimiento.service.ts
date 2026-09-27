import { Prisma, type PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type { CreateSalidaDTO, CreateEntradaDTO } from "./movimiento.types.js";

function getCostoUnitario(
  stock: { precioUnit: Prisma.Decimal; precioProm: Prisma.Decimal },
  metodo: string,
) {
  if (metodo === "PROMEDIO_PONDERADO") {
    return new Prisma.Decimal(stock.precioProm);
  }
  return new Prisma.Decimal(stock.precioUnit);
}

async function getMetodoCosteo(tx: PrismaClient | Prisma.TransactionClient) {
  const config = await tx.configuracion.findFirst({
    orderBy: { createdAt: "desc" },
    select: { metodoCosteo: true },
  });
  return config?.metodoCosteo ?? "ULTIMO_PRECIO";
}

async function validarUsuarios(
  tx: PrismaClient | Prisma.TransactionClient,
  usuarioEntregaId: number,
  usuarioRecibidoId: number,
) {
  const [usuarioEntrega, usuarioRecibido] = await Promise.all([
    tx.user.findUnique({ where: { id: usuarioEntregaId }, select: { id: true } }),
    tx.user.findUnique({ where: { id: usuarioRecibidoId }, select: { id: true } }),
  ]);

  if (!usuarioEntrega) {
    throw new HttpError("Usuario que entrega no encontrado", 404);
  }

  if (!usuarioRecibido) {
    throw new HttpError("Usuario que recibe no encontrado", 404);
  }
}

async function reordenarMovimientosProductoMes(
  productoId: number,
  anio: number,
  mes: number,
): Promise<{ movimientosActualizados: number; ordenCorregido: boolean }> {
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta  = new Date(Date.UTC(mes === 12 ? anio + 1 : anio, mes === 12 ? 0 : mes, 1));

  const saldo = await (prisma.saldoMensual.findUnique as any)({
    where: { productoId_anio_mes: { productoId, anio, mes } },
    select: { saldoInicial: true, precioUnitProm: true },
  });

  if (!saldo) return { movimientosActualizados: 0, ordenCorregido: false };

  const movimientos = await prisma.movimiento.findMany({
    where: {
      productoId,
      OR: [
        { esRetroactivo: true,  periodoAnio: anio, periodoMes: mes },
        { esRetroactivo: false, createdAt: { gte: desde, lt: hasta } },
      ],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, tipo: true, cantidad: true, createdAt: true, esRetroactivo: true },
  });

  if (movimientos.length === 0) return { movimientosActualizados: 0, ordenCorregido: false };

  const entradas = movimientos.filter(m => m.tipo === "ENTRADA");
  const salidas  = movimientos.filter(m => m.tipo === "SALIDA");
  const ordenLogico = [...entradas, ...salidas];

  // Build timestamp pool: retroactive movements get a synthetic timestamp at the very
  // start of the period month so they stay within the period's date range for bin-card
  // queries. Their original createdAt belongs to a different month and would make them
  // invisible in the period's bin-card.
  let retroSynIdx = 0;
  const timestamps = [...movimientos]
    .map(m => ({
      id: m.id,
      ts: m.esRetroactivo ? new Date(desde.getTime() + retroSynIdx++) : m.createdAt,
    }))
    .sort((a, b) => a.ts.getTime() - b.ts.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(m => m.ts);

  const periodCPP = new Prisma.Decimal(saldo.precioUnitProm ?? 0);
  let currentStock = new Prisma.Decimal(saldo.saldoInicial ?? 0);
  let movActualizados = 0;

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < ordenLogico.length; i++) {
      const mov        = ordenLogico[i]!;
      const qty        = new Prisma.Decimal(mov.cantidad);
      const stockAntes = currentStock;

      if (mov.tipo === "ENTRADA") {
        currentStock = currentStock.add(qty);
      } else {
        currentStock = currentStock.sub(qty);
      }

      const stockDespues = currentStock;
      const saldoBs = currentStock.isNegative()
        ? new Prisma.Decimal(0)
        : currentStock.mul(periodCPP);

      const data: any = { stockAntes, stockDespues, saldoBs, createdAt: timestamps[i]! };

      // Recalculate SALIDA Bs fields using periodCPP for internal consistency
      // with saldoBs (which also uses periodCPP). ENTRADA keeps original precioUnit/entradaBs.
      if (mov.tipo === "SALIDA") {
        data.precioUnit = periodCPP;
        data.salidaBs   = qty.mul(periodCPP);
        data.entradaBs  = new Prisma.Decimal(0);
      }

      await tx.movimiento.update({ where: { id: mov.id }, data });
      movActualizados++;
    }
  });

  return { movimientosActualizados: movActualizados, ordenCorregido: true };
}

export const movimientoService = {
  async createSalida(data: CreateSalidaDTO, userId: number) {
    const result = await prisma.$transaction(async (tx) => {
      await validarUsuarios(tx, data.usuarioEntregaId, data.usuarioRecibidoId);

      const producto = await tx.producto.findUnique({
        where: { id: data.productoId },
        include: { stock: true },
      });

      if (!producto) {
        throw new HttpError("Producto no encontrado", 404);
      }

      if (!producto.stock) {
        throw new HttpError("El producto no tiene stock inicializado", 400);
      }

      const cuentaId = data.cuentaId ?? producto.cuentaId;
      if (!cuentaId) {
        throw new HttpError("Cuenta contable requerida para movimientos de salida", 400);
      }

      const cuenta = await tx.cuentaContable.findUnique({ where: { id: cuentaId } });
      if (!cuenta) {
        throw new HttpError("Cuenta contable no encontrada", 404);
      }

      const cantidad = new Prisma.Decimal(data.cantidad);
      if (cantidad.lte(0)) {
        throw new HttpError("La cantidad debe ser mayor a 0", 400);
      }

      const stockAntes = new Prisma.Decimal(producto.stock.cantidad);
      if (stockAntes.lt(cantidad)) {
        throw new HttpError("Stock insuficiente para la salida", 409);
      }

      const metodoCosteo = await getMetodoCosteo(tx);
      const precioUnit = getCostoUnitario(producto.stock, metodoCosteo);
      const salidaBs = precioUnit.mul(cantidad);
      const stockDespues = stockAntes.sub(cantidad);
      const saldoBs = stockDespues.mul(precioUnit);

      await tx.stock.update({
        where: { productoId: data.productoId },
        data: { cantidad: stockDespues },
      });

      const movimiento = await tx.movimiento.create({
        data: {
          operationId: randomUUID(),
          productoId: data.productoId,
          tipo: "SALIDA",
          cantidad,
          precioUnit,
          entradaBs: new Prisma.Decimal(0),
          salidaBs,
          saldoBs,
          stockAntes,
          stockDespues,
          usuarioId: userId,
          usuarioEntregaId: data.usuarioEntregaId,
          usuarioRecibidoId: data.usuarioRecibidoId,
          cuentaId,
          ...(data.referencia !== undefined ? { referencia: data.referencia } : {}),
          ...(data.referenciaId !== undefined ? { referenciaId: data.referenciaId } : {}),
        },
        include: {
          producto: true,
          usuario: { select: { id: true, nombre: true, email: true } },
          usuarioEntrega: { select: { id: true, nombre: true, email: true } },
          usuarioRecibido: { select: { id: true, nombre: true, email: true } },
          cuenta: {
            include: {
              centroCosto: true,
              funcionGasto: true,
              sector: true,
            },
          },
        },
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_SALIDA_INVENTARIO",
          data: {
            movimientoId: movimiento.id,
            productoId: data.productoId,
            cantidad: data.cantidad,
            cuentaId,
            usuarioEntregaId: data.usuarioEntregaId,
            usuarioRecibidoId: data.usuarioRecibidoId,
            referencia: data.referencia,
            referenciaId: data.referenciaId,
          },
        },
      });

      return movimiento;
    });

    logger.info(
      { userId, movimientoId: result.id, action: "CREATE_SALIDA_INVENTARIO" },
      "Salida de inventario registrada",
    );

    return result;
  },

  async createEntrada(data: CreateEntradaDTO, userId: number) {
    const result = await prisma.$transaction(async (tx) => {
      await validarUsuarios(tx, data.usuarioEntregaId, data.usuarioRecibidoId);

      const producto = await tx.producto.findUnique({
        where: { id: data.productoId },
        include: { stock: true },
      });

      if (!producto) {
        throw new HttpError("Producto no encontrado", 404);
      }

      if (!producto.stock) {
        throw new HttpError("El producto no tiene stock inicializado", 400);
      }

      let cuentaId = data.cuentaId ?? producto.cuentaId;
      let cuenta = null;
      if (cuentaId) {
        cuenta = await tx.cuentaContable.findUnique({ where: { id: cuentaId } });
        if (!cuenta) {
          throw new HttpError("Cuenta contable no encontrada", 404);
        }
      }

      const cantidad = new Prisma.Decimal(data.cantidad);
      const precioUnit = new Prisma.Decimal(data.precioUnit);
      if (cantidad.lte(0) || precioUnit.lte(0)) {
        throw new HttpError("La cantidad y precio deben ser mayores a 0", 400);
      }

      const stockAntes = new Prisma.Decimal(producto.stock.cantidad);
      const stockDespues = stockAntes.add(cantidad);
      const entradaBs = precioUnit.mul(cantidad);
      const saldoBs = stockDespues.mul(precioUnit);

      await tx.stock.update({
        where: { productoId: data.productoId },
        data: {
          cantidad: stockDespues,
          precioUnit: precioUnit,
        },
      });

      const movimiento = await tx.movimiento.create({
        data: {
          operationId: randomUUID(),
          productoId: data.productoId,
          tipo: "ENTRADA",
          cantidad,
          precioUnit,
          entradaBs,
          salidaBs: new Prisma.Decimal(0),
          saldoBs,
          stockAntes,
          stockDespues,
          usuarioId: userId,
          usuarioEntregaId: data.usuarioEntregaId,
          usuarioRecibidoId: data.usuarioRecibidoId,
          ...(cuentaId ? { cuentaId } : {}),
          ...(data.referencia !== undefined ? { referencia: data.referencia } : {}),
          ...(data.referenciaId !== undefined ? { referenciaId: data.referenciaId } : {}),
        },
        include: {
          producto: true,
          usuario: { select: { id: true, nombre: true, email: true } },
          usuarioEntrega: { select: { id: true, nombre: true, email: true } },
          usuarioRecibido: { select: { id: true, nombre: true, email: true } },
          cuenta: {
            include: {
              centroCosto: true,
              funcionGasto: true,
              sector: true,
            },
          },
        },
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_ENTRADA_INVENTARIO",
          data: {
            movimientoId: movimiento.id,
            productoId: data.productoId,
            cantidad: data.cantidad,
            precioUnit: data.precioUnit,
            cuentaId,
            usuarioEntregaId: data.usuarioEntregaId,
            usuarioRecibidoId: data.usuarioRecibidoId,
            referencia: data.referencia,
            referenciaId: data.referenciaId,
          },
        },
      });

      return movimiento;
    });

    logger.info(
      { userId, movimientoId: result.id, action: "CREATE_ENTRADA_INVENTARIO" },
      "Entrada de inventario registrada",
    );

    return result;
  },

  async reordenarMovimientos({ productoId, anio, mes }: { productoId?: number; anio: number; mes: number }) {
    const desde = new Date(Date.UTC(anio, mes - 1, 1));
    const hasta  = new Date(Date.UTC(mes === 12 ? anio + 1 : anio, mes === 12 ? 0 : mes, 1));

    // Determine which products to process
    let productoIds: number[];
    if (productoId) {
      productoIds = [productoId];
    } else {
      const saldos = await prisma.saldoMensual.findMany({
        where: { anio, mes },
        select: { productoId: true },
      });
      productoIds = saldos.map(s => s.productoId);
    }

    const resultados: { productoId: number; movimientosActualizados: number }[] = [];
    const errores: { productoId: number; error: string }[] = [];
    let totalMovs = 0;

    for (const pid of productoIds) {
      try {
        const r = await reordenarMovimientosProductoMes(pid, anio, mes);
        if (r.movimientosActualizados > 0) {
          resultados.push({ productoId: pid, movimientosActualizados: r.movimientosActualizados });
          totalMovs += r.movimientosActualizados;
        }
      } catch (err) {
        errores.push({ productoId: pid, error: String(err) });
      }
    }

    logger.info({ anio, mes, productoId, totalMovs }, "Movimientos reordenados");
    return {
      anio,
      mes,
      productoId: productoId ?? null,
      productosReordenados: resultados.length,
      movimientosActualizados: totalMovs,
      resultados,
      errores,
    };
  },
};
