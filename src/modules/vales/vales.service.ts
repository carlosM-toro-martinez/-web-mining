import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreateValeDTO,
  AprobarValeDTO,
  EntregarValeDTO,
  ValeQueryDTO,
} from "./vales.types.js";

export const valesService = {
  async createVale(data: CreateValeDTO, userId: number) {
    // Validar que todos los productos existan
    const productos = await prisma.producto.findMany({
      where: {
        id: { in: data.items.map((item) => item.productoId) },
      },
      select: { id: true },
    });

    if (productos.length !== data.items.length) {
      throw new HttpError("Uno o más productos no encontrados", 404);
    }

    const solicitante = await prisma.user.findUnique({
      where: { id: data.solicitanteId },
      select: { id: true },
    });

    if (!solicitante) {
      throw new HttpError("Solicitante no encontrado", 404);
    }

    const vale = await prisma.vale.create({
      data: {
        solicitanteId: data.solicitanteId,
        estado: "PENDIENTE",
        items: {
          create: data.items.map((item) => ({
            productoId: item.productoId,
            cantidadSolicitada: item.cantidadSolicitada,
          })),
        },
      },
      include: {
        solicitante: { select: { id: true, nombre: true, email: true } },
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
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_VALE",
        data: { valeId: vale.id, items: data.items },
      },
    });

    logger.info({ userId, valeId: vale.id, action: "CREATE_VALE" }, "Vale creado");

    return vale;
  },

  async getVales(query: ValeQueryDTO, userId: number) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ solicitanteId: userId }, { superintendenteId: userId }, { almaceneroId: userId }],
    };

    if (query.estado) {
      where.estado = query.estado;
    }

    const [vales, total] = await Promise.all([
      prisma.vale.findMany({
        where,
        skip,
        take: limit,
        include: {
          solicitante: { select: { id: true, nombre: true, email: true } },
          superintendente: { select: { id: true, nombre: true, email: true } },
          almacenero: { select: { id: true, nombre: true, email: true } },
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
      prisma.vale.count({ where }),
    ]);

    return {
      vales,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getValeById(id: string) {
    return prisma.vale.findUnique({
      where: { id },
      include: {
        solicitante: { select: { id: true, nombre: true, email: true } },
        superintendente: { select: { id: true, nombre: true, email: true } },
        almacenero: { select: { id: true, nombre: true, email: true } },
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

  async aprobarVale(id: string, data: AprobarValeDTO, userId: number) {
    const vale = await prisma.vale.findUnique({
      where: { id },
      select: { estado: true },
    });

    if (!vale) {
      throw new HttpError("Vale no encontrado", 404);
    }

    if (vale.estado !== "PENDIENTE") {
      throw new HttpError("Solo se pueden aprobar vales PENDIENTES", 409);
    }

    const valeActualizado = await prisma.vale.update({
      where: { id },
      data: {
        estado: "APROBADO",
        superintendenteId: data.superintendenteId,
        aprobadoAt: new Date(),
      },
      include: {
        solicitante: { select: { id: true, nombre: true, email: true } },
        superintendente: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "APROBAR_VALE",
        data: {
          valeId: id,
          superintendenteId: data.superintendenteId,
        },
      },
    });

    logger.info({ userId, valeId: id, action: "APROBAR_VALE" }, "Vale aprobado");

    return valeActualizado;
  },

  async entregarVale(id: string, data: EntregarValeDTO, userId: number) {
    const vale = await prisma.vale.findUnique({
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

    if (!vale) {
      throw new HttpError("Vale no encontrado", 404);
    }

    if (vale.estado !== "APROBADO" && vale.estado !== "PARCIAL") {
      throw new HttpError("Solo se pueden entregar vales APROBADOS", 409);
    }

    // Validar que todas las cantidades sean válidas
    const entregaIds = Object.keys(data.cantidadesEntregadas);
    for (const itemId of entregaIds) {
      const item = vale.items.find((i) => i.id === itemId);
      if (!item) {
        throw new HttpError(`Item ${itemId} no encontrado en el vale`, 404);
      }

      const cantidad = data.cantidadesEntregadas[itemId];
      if (cantidad === undefined || cantidad < 0) {
        throw new HttpError(`Cantidad inválida para item ${itemId}`, 400);
      }

      const entregadoPrevio = new Prisma.Decimal(item.cantidadEntregada ?? 0);
      const cantidadSolicitada = new Prisma.Decimal(item.cantidadSolicitada);
      const restante = cantidadSolicitada.sub(entregadoPrevio);

      if (new Prisma.Decimal(cantidad).gt(restante)) {
        throw new HttpError(
          `La cantidad entregada no puede exceder la cantidad restante para ${item.producto.nombre}`,
          409,
        );
      }

      if (!item.producto.stock || new Prisma.Decimal(item.producto.stock.cantidad).lt(cantidad)) {
        throw new HttpError(`Stock insuficiente para ${item.producto.nombre}`, 409);
      }
    }

    // Crear movimientos de salida para cada item
    const movimientos = [];
    for (const item of vale.items) {
      const cantidad = data.cantidadesEntregadas[item.id] ?? 0;
      if (cantidad > 0) {
        const cuentaId = item.producto.cuentaId;
        if (!cuentaId) {
          throw new HttpError(
            `Producto ${item.producto.nombre} no tiene cuenta contable asignada`,
            400,
          );
        }

        const movimiento = await prisma.movimiento.create({
          data: {
            operationId: randomUUID(),
            productoId: item.productoId,
            tipo: "SALIDA",
            cantidad,
            precioUnit: item.producto.stock!.precioUnit,
            entradaBs: 0,
            salidaBs: new Prisma.Decimal(item.producto.stock!.precioUnit).mul(cantidad),
            saldoBs: new Prisma.Decimal(item.producto.stock!.cantidad)
              .sub(cantidad)
              .mul(item.producto.stock!.precioUnit),
            stockAntes: item.producto.stock!.cantidad,
            stockDespues: new Prisma.Decimal(item.producto.stock!.cantidad).sub(cantidad),
            usuarioId: userId,
            usuarioEntregaId: userId,
            usuarioRecibidoId: vale.solicitanteId,
            cuentaId,
            referencia: "VALE",
            referenciaId: id,
          },
        });

        const cantidadEntregadaAnterior = new Prisma.Decimal(item.cantidadEntregada ?? 0);
        const cantidadEntregadaNueva = cantidadEntregadaAnterior.add(cantidad);

        await prisma.valeItem.update({
          where: { id: item.id },
          data: { cantidadEntregada: cantidadEntregadaNueva },
        });

        // Actualizar stock
        await prisma.stock.update({
          where: { productoId: item.productoId },
          data: {
            cantidad: new Prisma.Decimal(item.producto.stock!.cantidad).sub(cantidad),
          },
        });

        movimientos.push(movimiento);
      }
    }

    // Determinar nuevo estado del vale
    const allFullyDelivered = vale.items.every((item) => {
      const entregadoPrevio = new Prisma.Decimal(item.cantidadEntregada ?? 0);
      const entregadaHoy = new Prisma.Decimal(data.cantidadesEntregadas[item.id] ?? 0);
      const totalEntregado = entregadoPrevio.add(entregadaHoy);
      return totalEntregado.equals(new Prisma.Decimal(item.cantidadSolicitada));
    });

    const newState = allFullyDelivered ? "COMPLETADO" : "PARCIAL";

    const valeActualizado = await prisma.vale.update({
      where: { id },
      data: {
        estado: newState,
        almaceneroId: userId,
        entregadoAt: new Date(),
      },
      include: {
        solicitante: { select: { id: true, nombre: true, email: true } },
        superintendente: { select: { id: true, nombre: true, email: true } },
        almacenero: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "ENTREGAR_VALE",
        data: {
          valeId: id,
          cantidadesEntregadas: data.cantidadesEntregadas,
          nuevoEstado: newState,
        },
      },
    });

    logger.info({ userId, valeId: id, action: "ENTREGAR_VALE" }, "Vale entregado");

    return {
      vale: valeActualizado,
      movimientos,
    };
  },

  async rechazarVale(id: string, userId: number) {
    const vale = await prisma.vale.findUnique({
      where: { id },
      select: { estado: true },
    });

    if (!vale) {
      throw new HttpError("Vale no encontrado", 404);
    }

    if (vale.estado !== "PENDIENTE") {
      throw new HttpError("Solo se pueden rechazar vales PENDIENTES", 409);
    }

    const valeActualizado = await prisma.vale.update({
      where: { id },
      data: { estado: "RECHAZADO" },
      include: {
        solicitante: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "RECHAZAR_VALE",
        data: { valeId: id },
      },
    });

    logger.info({ userId, valeId: id, action: "RECHAZAR_VALE" }, "Vale rechazado");

    return valeActualizado;
  },
};
