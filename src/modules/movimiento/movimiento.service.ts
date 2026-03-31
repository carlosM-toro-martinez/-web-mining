import { Prisma, type PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type { CreateSalidaDTO } from "./movimiento.types.js";

function getCostoUnitario(stock: { precioUnit: Prisma.Decimal; precioProm: Prisma.Decimal }, metodo: string) {
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

      if (!producto) {
        throw new HttpError("Producto no encontrado", 404);
      }

      if (!producto.stock) {
        throw new HttpError("El producto no tiene stock inicializado", 400);
      }

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
          cuentaId: data.cuentaId,
          ...(data.referencia !== undefined ? { referencia: data.referencia } : {}),
          ...(data.referenciaId !== undefined ? { referenciaId: data.referenciaId } : {}),
        },
        include: {
          producto: true,
          cuenta: {
            include: {
              centroCosto: true,
              funcionGasto: true,
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
            cuentaId: data.cuentaId,
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
};
