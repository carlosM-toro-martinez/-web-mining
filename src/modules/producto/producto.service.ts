import { prisma } from "../../config/prisma.js";
import type { CreateProductoDTO, UpdateProductoDTO } from "./producto.types.js";
import type { z } from "zod";
import type { productoQuerySchema } from "./producto.schema.js";
import { logger } from "../../config/logger.js";

type ProductoQuery = z.infer<typeof productoQuerySchema>;

export const productoService = {
  async getAll(query: ProductoQuery) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where = query.search
      ? {
          nombre: {
            contains: String(query.search),
            mode: "insensitive" as const,
          },
        }
      : {};

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        skip,
        take: limit,
        where,
        include: {
          categoria: true,
          stock: true,
        },
      }),
      prisma.producto.count({ where }),
    ]);

    return { productos, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id: number) {
    return prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        stock: true,
      },
    });
  },

  async create(data: CreateProductoDTO, userId: number) {
    const producto = await prisma.producto.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        unidad: data.unidad,
        categoriaId: data.categoriaId,
        esEpp: data.esEpp ?? false,

        stock: {
          create: {
            cantidad: 0,
            precioUnit: 0,
            precioProm: 0,
          },
        },
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_PRODUCTO",
        data: { productoId: producto.id, ...data },
      },
    });

    logger.info({ userId, productoId: producto.id, action: "CREATE_PRODUCTO" }, "Producto creado");

    return producto;
  },

  async update(id: number, data: UpdateProductoDTO, userId: number) {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

    const producto = await prisma.producto.update({
      where: { id },
      data: cleanData,
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_PRODUCTO",
        data: { productoId: id, ...cleanData },
      },
    });

    logger.info({ userId, productoId: id, action: "UPDATE_PRODUCTO" }, "Producto actualizado");

    return producto;
  },

  async remove(id: number, userId: number) {
    await prisma.producto.delete({
      where: { id },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "DELETE_PRODUCTO",
        data: { productoId: id },
      },
    });

    logger.info({ userId, productoId: id, action: "DELETE_PRODUCTO" }, "Producto eliminado");
  },
};
