import { Prisma, type PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type { CreateCompraDTO, RecibirCompraDTO, CompraQueryDTO } from "./compras.types.js";

export const comprasService = {
  async createCompra(data: CreateCompraDTO, userId: number) {
    // Validar que proveedor existe
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: data.proveedorId },
    });

    if (!proveedor) {
      throw new HttpError("Proveedor no encontrado", 404);
    }

    // Validar que todos los productos existan
    const productos = await prisma.producto.findMany({
      where: {
        id: { in: data.items.map((item) => item.productoId) },
      },
      select: { id: true, cuentaId: true },
    });

    if (productos.length !== data.items.length) {
      throw new HttpError("Uno o más productos no encontrados", 404);
    }

    // Validar que todos los productos tengan cuenta contable
    const sinCuenta = productos.filter((p) => !p.cuentaId);
    if (sinCuenta.length > 0) {
      throw new HttpError("Todos los productos deben tener una cuenta contable asignada", 400);
    }

    const compra = await prisma.compra.create({
      data: {
        proveedorId: data.proveedorId,
        usuarioRegistroId: userId,
        estado: "PENDIENTE",
        observacion: data.observacion ?? null,
        items: {
          create: data.items.map((item) => ({
            productoId: item.productoId,
            cantidadPedida: item.cantidadPedida,
            precioUnit: item.precioUnit,
          })),
        },
      },
      include: {
        proveedor: true,
        usuarioRegistro: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: true,
          },
        },
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_COMPRA",
        data: {
          compraId: compra.id,
          proveedorId: data.proveedorId,
          items: data.items,
        },
      },
    });

    logger.info({ userId, compraId: compra.id, action: "CREATE_COMPRA" }, "Compra creada");

    return compra;
  },

  async getCompras(query: CompraQueryDTO, userId: number) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ usuarioRegistroId: userId }, { usuarioRecibidoId: userId }],
    };

    if (query.estado) {
      where.estado = query.estado;
    }

    if (query.proveedorId) {
      where.proveedorId = query.proveedorId;
    }

    const [compras, total] = await Promise.all([
      prisma.compra.findMany({
        where,
        skip,
        take: limit,
        include: {
          proveedor: true,
          usuarioRegistro: { select: { id: true, nombre: true, email: true } },
          usuarioRecibe: { select: { id: true, nombre: true, email: true } },
          items: {
            include: {
              producto: {
                include: {
                  stock: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.compra.count({ where }),
    ]);

    return {
      compras,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getCompraById(id: string) {
    return prisma.compra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        usuarioRegistro: { select: { id: true, nombre: true, email: true } },
        usuarioRecibe: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: {
              include: {
                stock: true,
                cuenta: {
                  include: {
                    centroCosto: true,
                    funcionGasto: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async recibirCompra(id: string, data: RecibirCompraDTO, userId: number) {
    const compra = await prisma.compra.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: {
              include: {
                stock: true,
                cuenta: true,
              },
            },
          },
        },
      },
    });

    if (!compra) {
      throw new HttpError("Compra no encontrada", 404);
    }

    if (compra.estado === "COMPLETADO") {
      throw new HttpError("La compra ya está completada", 409);
    }

    // Validar que todas las cantidades sean válidas
    const recibirIds = Object.keys(data.cantidadesRecibidas);
    for (const itemId of recibirIds) {
      const item = compra.items.find((i) => i.id === itemId);
      if (!item) {
        throw new HttpError(`Item ${itemId} no encontrado en la compra`, 404);
      }

      const cantidad = data.cantidadesRecibidas[itemId];
      if (cantidad === undefined || cantidad < 0) {
        throw new HttpError(`Cantidad inválida para item ${itemId}`, 400);
      }
      if (cantidad > Number(item.cantidadPedida)) {
        throw new HttpError(
          `La cantidad recibida no puede exceder la pedida para ${item.producto.nombre}`,
          409,
        );
      }
    }

    // Crear movimientos de entrada para cada item y actualizar stock
    const movimientos = [];
    for (const item of compra.items) {
      const cantidadRecibidaAhora = data.cantidadesRecibidas[item.id] ?? 0;
      if (cantidadRecibidaAhora > 0) {
        const stockAntes = item.producto.stock!.cantidad;
        const stockDespues = new Prisma.Decimal(stockAntes).add(cantidadRecibidaAhora);
        const precioUnit = item.precioUnit;

        const movimiento = await prisma.movimiento.create({
          data: {
            operationId: randomUUID(),
            productoId: item.productoId,
            tipo: "ENTRADA",
            cantidad: cantidadRecibidaAhora,
            precioUnit,
            entradaBs: new Prisma.Decimal(precioUnit).mul(cantidadRecibidaAhora),
            salidaBs: 0,
            saldoBs: stockDespues.mul(precioUnit),
            stockAntes,
            stockDespues,
            usuarioId: userId,
            usuarioEntregaId: userId,
            cuentaId: item.producto.cuentaId,
            referencia: "COMPRA",
            referenciaId: id,
          },
        });

        await prisma.compraItem.update({
          where: { id: item.id },
          data: {
            cantidadRecibida: new Prisma.Decimal(item.cantidadRecibida).add(cantidadRecibidaAhora),
          },
        });

        // Actualizar stock
        await prisma.stock.update({
          where: { productoId: item.productoId },
          data: {
            cantidad: stockDespues,
            precioUnit: precioUnit,
          },
        });

        movimientos.push(movimiento);
      }
    }

    // Verificar si la compra está completa
    const compraActualizada = await prisma.compra.findUnique({
      where: { id },
      include: { items: true },
    });

    const allFullyReceived = compraActualizada!.items.every((item) => {
      return new Prisma.Decimal(item.cantidadRecibida).equals(
        new Prisma.Decimal(item.cantidadPedida),
      );
    });

    const anyReceived = compraActualizada!.items.some((item) => {
      return new Prisma.Decimal(item.cantidadRecibida).gt(0);
    });

    const newState = allFullyReceived ? "COMPLETADO" : anyReceived ? "PARCIAL" : "PENDIENTE";

    const compraFinal = await prisma.compra.update({
      where: { id },
      data: {
        estado: newState,
        usuarioRecibidoId: userId,
        recibidoAt: newState === "COMPLETADO" ? new Date() : compra.recibidoAt,
      },
      include: {
        proveedor: true,
        usuarioRegistro: { select: { id: true, nombre: true, email: true } },
        usuarioRecibe: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: true,
          },
        },
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "RECIBIR_COMPRA",
        data: {
          compraId: id,
          cantidadesRecibidas: data.cantidadesRecibidas,
          nuevoEstado: newState,
        },
      },
    });

    logger.info({ userId, compraId: id, action: "RECIBIR_COMPRA" }, "Compra recibida");

    return {
      compra: compraFinal,
      movimientos,
    };
  },
};
