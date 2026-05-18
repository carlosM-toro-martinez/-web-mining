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

const ROLES_SUPERVISORES = ["ADMIN", "SUPERINTENDENTE"];

const valeIncludeCompleto = {
  solicitante: { select: { id: true, nombre: true, email: true } },
  superintendente: { select: { id: true, nombre: true, email: true } },
  almacenero: { select: { id: true, nombre: true, email: true } },
  items: {
    include: {
      producto: {
        include: { stock: true },
      },
    },
  },
} as const;

export const valesService = {
  async createVale(data: CreateValeDTO, userId: number) {
    const productos = await prisma.producto.findMany({
      where: { id: { in: data.items.map((item) => item.productoId) } },
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
      include: valeIncludeCompleto,
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

  async getVales(query: ValeQueryDTO, userId: number, userRole: string) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    // ADMIN y SUPERINTENDENTE ven todos los vales; el resto solo los propios
    const where: any = ROLES_SUPERVISORES.includes(userRole)
      ? {}
      : { OR: [{ solicitanteId: userId }, { superintendenteId: userId }, { almaceneroId: userId }] };

    if (query.estado) where.estado = query.estado;
    if (query.solicitanteId) where.solicitanteId = Number(query.solicitanteId);

    const [vales, total] = await Promise.all([
      prisma.vale.findMany({
        where,
        skip,
        take: limit,
        include: valeIncludeCompleto,
        orderBy: { createdAt: "desc" },
      }),
      prisma.vale.count({ where }),
    ]);

    return { vales, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getHistorialSolicitante(solicitanteId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = { solicitanteId };

    const [vales, total] = await Promise.all([
      prisma.vale.findMany({
        where,
        skip,
        take: limit,
        include: valeIncludeCompleto,
        orderBy: { createdAt: "desc" },
      }),
      prisma.vale.count({ where }),
    ]);

    return { vales, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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
                cuenta: { include: { centroCosto: true, funcionGasto: true } },
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
      include: {
        items: {
          include: { producto: { include: { stock: true } } },
        },
      },
    });

    if (!vale) throw new HttpError("Vale no encontrado", 404);
    if (vale.estado !== "PENDIENTE") throw new HttpError("Solo se pueden aprobar vales PENDIENTES", 409);

    // Verificar stock disponible (cantidad - cantidadReservada) para cada item
    for (const item of vale.items) {
      const stock = item.producto.stock;
      if (!stock) throw new HttpError(`Producto ${item.producto.nombre} no tiene stock registrado`, 400);

      const disponible = new Prisma.Decimal(stock.cantidad).sub(stock.cantidadReservada);
      if (disponible.lt(item.cantidadSolicitada)) {
        throw new HttpError(
          `Stock insuficiente para ${item.producto.nombre}. Disponible: ${disponible}, Solicitado: ${item.cantidadSolicitada}`,
          409,
        );
      }
    }

    // Reservar stock para cada item
    for (const item of vale.items) {
      await prisma.stock.update({
        where: { productoId: item.productoId },
        data: {
          cantidadReservada: {
            increment: item.cantidadSolicitada,
          },
        },
      });
    }

    const valeActualizado = await prisma.vale.update({
      where: { id },
      data: {
        estado: "APROBADO",
        superintendenteId: data.superintendenteId,
        aprobadoAt: new Date(),
      },
      include: valeIncludeCompleto,
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "APROBAR_VALE",
        data: { valeId: id, superintendenteId: data.superintendenteId },
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
          include: { producto: { include: { stock: true, cuenta: true } } },
        },
      },
    });

    if (!vale) throw new HttpError("Vale no encontrado", 404);
    if (vale.estado !== "APROBADO" && vale.estado !== "PARCIAL") {
      throw new HttpError("Solo se pueden entregar vales APROBADOS o PARCIALES", 409);
    }

    // Validar cantidades
    const entregaIds = Object.keys(data.cantidadesEntregadas);
    for (const itemId of entregaIds) {
      const item = vale.items.find((i) => i.id === itemId);
      if (!item) throw new HttpError(`Item ${itemId} no encontrado en el vale`, 404);

      const cantidad = data.cantidadesEntregadas[itemId];
      if (cantidad === undefined || cantidad < 0) throw new HttpError(`Cantidad inválida para item ${itemId}`, 400);

      const entregadoPrevio = new Prisma.Decimal(item.cantidadEntregada ?? 0);
      const restante = new Prisma.Decimal(item.cantidadSolicitada).sub(entregadoPrevio);

      if (new Prisma.Decimal(cantidad).gt(restante)) {
        throw new HttpError(
          `La cantidad entregada supera la restante para ${item.producto.nombre}`,
          409,
        );
      }

      if (!item.producto.stock || new Prisma.Decimal(item.producto.stock.cantidad).lt(cantidad)) {
        throw new HttpError(`Stock insuficiente para ${item.producto.nombre}`, 409);
      }
    }

    // Crear movimientos y actualizar stock
    const movimientos = [];
    for (const item of vale.items) {
      const cantidad = data.cantidadesEntregadas[item.id] ?? 0;
      if (cantidad <= 0) continue;

      if (!item.producto.cuentaId) {
        throw new HttpError(`Producto ${item.producto.nombre} no tiene cuenta contable asignada`, 400);
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
          cuentaId: item.producto.cuentaId,
          referencia: "VALE",
          referenciaId: id,
        },
      });

      await prisma.valeItem.update({
        where: { id: item.id },
        data: {
          cantidadEntregada: new Prisma.Decimal(item.cantidadEntregada ?? 0).add(cantidad),
        },
      });

      // Descontar cantidad física y liberar reserva
      await prisma.stock.update({
        where: { productoId: item.productoId },
        data: {
          cantidad: { decrement: cantidad },
          cantidadReservada: {
            decrement: Prisma.Decimal.min(
              new Prisma.Decimal(cantidad),
              item.producto.stock!.cantidadReservada,
            ),
          },
        },
      });

      movimientos.push(movimiento);
    }

    // Determinar nuevo estado
    const valeRefrescado = await prisma.vale.findUnique({
      where: { id },
      include: { items: true },
    });

    const allDelivered = valeRefrescado!.items.every((item) =>
      new Prisma.Decimal(item.cantidadEntregada).gte(item.cantidadSolicitada),
    );

    const newState = allDelivered ? "COMPLETADO" : "PARCIAL";

    const valeActualizado = await prisma.vale.update({
      where: { id },
      data: { estado: newState, almaceneroId: userId, entregadoAt: new Date() },
      include: valeIncludeCompleto,
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "ENTREGAR_VALE",
        data: { valeId: id, cantidadesEntregadas: data.cantidadesEntregadas, nuevoEstado: newState },
      },
    });

    logger.info({ userId, valeId: id, action: "ENTREGAR_VALE" }, "Vale entregado");
    return { vale: valeActualizado, movimientos };
  },

  async rechazarVale(id: string, userId: number) {
    const vale = await prisma.vale.findUnique({
      where: { id },
      include: {
        items: { include: { producto: { include: { stock: true } } } },
      },
    });

    if (!vale) throw new HttpError("Vale no encontrado", 404);
    if (vale.estado !== "PENDIENTE" && vale.estado !== "APROBADO") {
      throw new HttpError("Solo se pueden rechazar vales PENDIENTES o APROBADOS", 409);
    }

    // Si estaba APROBADO, liberar reservas
    if (vale.estado === "APROBADO") {
      for (const item of vale.items) {
        const stock = item.producto.stock;
        if (!stock) continue;
        await prisma.stock.update({
          where: { productoId: item.productoId },
          data: {
            cantidadReservada: {
              decrement: Prisma.Decimal.min(
                new Prisma.Decimal(item.cantidadSolicitada).sub(item.cantidadEntregada ?? 0),
                stock.cantidadReservada,
              ),
            },
          },
        });
      }
    }

    const valeActualizado = await prisma.vale.update({
      where: { id },
      data: { estado: "RECHAZADO" },
      include: valeIncludeCompleto,
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "RECHAZAR_VALE", data: { valeId: id } },
    });

    logger.info({ userId, valeId: id, action: "RECHAZAR_VALE" }, "Vale rechazado");
    return valeActualizado;
  },
};
