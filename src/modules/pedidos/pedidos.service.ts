import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type { CreatePedidoDTO, PedidoQueryDTO } from "./pedidos.types.js";

const pedidoInclude = {
  proveedor: true,
  items: {
    include: {
      producto: { select: { id: true, nombre: true, codigo: true, unidad: true } },
    },
  },
} as const;

export const pedidosService = {
  async createPedido(data: CreatePedidoDTO, userId: number) {
    const proveedor = await prisma.proveedor.findUnique({ where: { id: data.proveedorId } });
    if (!proveedor) throw new HttpError("Proveedor no encontrado", 404);

    const productos = await prisma.producto.findMany({
      where: { id: { in: data.items.map((i) => i.productoId) } },
      select: { id: true },
    });
    if (productos.length !== data.items.length) {
      throw new HttpError("Uno o más productos no encontrados", 404);
    }

    const pedido = await prisma.pedido.create({
      data: {
        proveedorId: data.proveedorId,
        estado: "PENDIENTE",
        observacion: data.observacion ?? null,
        items: {
          create: data.items.map((item) => ({
            productoId: item.productoId,
            cantidadPedida: item.cantidadPedida,
          })),
        },
      },
      include: pedidoInclude,
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_PEDIDO",
        data: { pedidoId: pedido.id, proveedorId: data.proveedorId, items: data.items },
      },
    });

    logger.info({ userId, pedidoId: pedido.id, action: "CREATE_PEDIDO" }, "Pedido creado");
    return pedido;
  },

  async getPedidos(query: PedidoQueryDTO) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.estado) where.estado = query.estado;
    if (query.proveedorId) where.proveedorId = query.proveedorId;

    const [pedidos, total] = await Promise.all([
      prisma.pedido.findMany({ where, skip, take: limit, include: pedidoInclude, orderBy: { createdAt: "desc" } }),
      prisma.pedido.count({ where }),
    ]);

    return { pedidos, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getPedidoById(id: string) {
    const pedido = await prisma.pedido.findUnique({ where: { id }, include: pedidoInclude });
    if (!pedido) throw new HttpError("Pedido no encontrado", 404);
    return pedido;
  },

  async cancelarPedido(id: string, userId: number) {
    const pedido = await prisma.pedido.findUnique({ where: { id }, select: { estado: true } });
    if (!pedido) throw new HttpError("Pedido no encontrado", 404);
    if (pedido.estado === "COMPLETADO") {
      throw new HttpError("No se puede cancelar un pedido completado", 409);
    }

    const pedidoActualizado = await prisma.pedido.update({
      where: { id },
      data: { estado: "COMPLETADO" },
      include: pedidoInclude,
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CANCELAR_PEDIDO", data: { pedidoId: id } },
    });

    logger.info({ userId, pedidoId: id, action: "CANCELAR_PEDIDO" }, "Pedido cancelado");
    return pedidoActualizado;
  },
};
