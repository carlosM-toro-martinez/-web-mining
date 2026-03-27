import { prisma } from "../../config/prisma.js";
import type { CreateProductoDTO, UpdateProductoDTO } from "./producto.types.js";
import type { z } from "zod";
import type { productoQuerySchema } from "./producto.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type ProductoQuery = z.infer<typeof productoQuerySchema>;

export const productoService = {
  async getAll(query: ProductoQuery) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.nombre = {
        contains: String(query.search),
        mode: "insensitive" as const,
      };
    }

    if (query.subgrupoId) {
      where.categoriaId = Number(query.subgrupoId);
    }

    if (query.grupoId) {
      where.categoria = {
        ...(where.categoria ?? {}),
        parentId: Number(query.grupoId),
      };
    }

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        skip,
        take: limit,
        where,
        include: {
          categoria: {
            include: {
              parent: true,
            },
          },
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
        categoria: {
          include: {
            parent: true,
          },
        },
        stock: true,
      },
    });
  },

  async validarJerarquiaCategoria(grupoId: number, subgrupoId: number) {
    const [grupo, subgrupo] = await Promise.all([
      prisma.categoriaInventario.findUnique({
        where: { id: grupoId },
        select: { id: true, parentId: true },
      }),
      prisma.categoriaInventario.findUnique({
        where: { id: subgrupoId },
        select: { id: true, parentId: true },
      }),
    ]);

    if (!grupo) {
      throw new HttpError("El grupo no existe", 404);
    }

    if (grupo.parentId !== null) {
      throw new HttpError("grupoId debe ser una categoría raíz (grupo)", 400);
    }

    if (!subgrupo) {
      throw new HttpError("El subgrupo no existe", 404);
    }

    if (subgrupo.parentId !== grupoId) {
      throw new HttpError("El subgrupo no pertenece al grupo enviado", 400);
    }
  },

  async create(data: CreateProductoDTO, userId: number) {
    await this.validarJerarquiaCategoria(data.grupoId, data.subgrupoId);

    const producto = await prisma.producto.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        unidad: data.unidad,
        categoriaId: data.subgrupoId,
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

    logger.info(
      { userId, productoId: producto.id, action: "CREATE_PRODUCTO" },
      "Producto creado",
    );

    return this.getById(producto.id);
  },

  async update(id: number, data: UpdateProductoDTO, userId: number) {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as any;

    if (cleanData.grupoId !== undefined || cleanData.subgrupoId !== undefined) {
      if (cleanData.grupoId === undefined || cleanData.subgrupoId === undefined) {
        throw new HttpError("Para cambiar categoría debes enviar grupoId y subgrupoId", 400);
      }

      await this.validarJerarquiaCategoria(cleanData.grupoId, cleanData.subgrupoId);
      cleanData.categoriaId = cleanData.subgrupoId;
    }

    delete cleanData.grupoId;
    delete cleanData.subgrupoId;

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

    return this.getById(producto.id);
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
