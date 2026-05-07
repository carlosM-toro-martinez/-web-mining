import { Prisma, type PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
<<<<<<< HEAD
import type { CreateSalidaDTO, CreateEntradaDTO } from "./movimiento.types.js";

function getCostoUnitario(
  stock: { precioUnit: Prisma.Decimal; precioProm: Prisma.Decimal },
  metodo: string,
) {
=======
import type { CreateSalidaDTO } from "./movimiento.types.js";

function getCostoUnitario(stock: { precioUnit: Prisma.Decimal; precioProm: Prisma.Decimal }, metodo: string) {
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
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

<<<<<<< HEAD
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

export const movimientoService = {
  async createSalida(data: CreateSalidaDTO, userId: number) {
    const result = await prisma.$transaction(async (tx) => {
      await validarUsuarios(tx, data.usuarioEntregaId, data.usuarioRecibidoId);

      const producto = await tx.producto.findUnique({
        where: { id: data.productoId },
        include: { stock: true },
      });
=======
export const movimientoService = {
  async createSalida(data: CreateSalidaDTO, userId: number) {
    const result = await prisma.$transaction(async (tx) => {
      const [producto, cuenta] = await Promise.all([
        tx.producto.findUnique({
          where: { id: data.productoId },
          include: { stock: true },
        }),
        tx.cuentaContable.findUnique({ where: { id: data.cuentaId } }),
      ]);
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd

      if (!producto) {
        throw new HttpError("Producto no encontrado", 404);
      }

      if (!producto.stock) {
        throw new HttpError("El producto no tiene stock inicializado", 400);
      }

<<<<<<< HEAD
      const cuentaId = data.cuentaId ?? producto.cuentaId;
      if (!cuentaId) {
        throw new HttpError("Cuenta contable requerida para movimientos de salida", 400);
      }

      const cuenta = await tx.cuentaContable.findUnique({ where: { id: cuentaId } });
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
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
<<<<<<< HEAD
          usuarioEntregaId: data.usuarioEntregaId,
          usuarioRecibidoId: data.usuarioRecibidoId,
          cuentaId,
=======
          cuentaId: data.cuentaId,
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
          ...(data.referencia !== undefined ? { referencia: data.referencia } : {}),
          ...(data.referenciaId !== undefined ? { referenciaId: data.referenciaId } : {}),
        },
        include: {
          producto: true,
<<<<<<< HEAD
          usuario: { select: { id: true, nombre: true, email: true } },
          usuarioEntrega: { select: { id: true, nombre: true, email: true } },
          usuarioRecibido: { select: { id: true, nombre: true, email: true } },
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
          cuenta: {
            include: {
              centroCosto: true,
              funcionGasto: true,
<<<<<<< HEAD
              sector: true,
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
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
<<<<<<< HEAD
            cuentaId,
            usuarioEntregaId: data.usuarioEntregaId,
            usuarioRecibidoId: data.usuarioRecibidoId,
            referencia: data.referencia,
            referenciaId: data.referenciaId,
=======
            cuentaId: data.cuentaId,
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
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
<<<<<<< HEAD

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
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
};
