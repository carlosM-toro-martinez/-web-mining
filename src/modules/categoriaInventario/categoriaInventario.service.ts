import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CategoriaInventarioQueryDTO,
  CreateCategoriaInventarioDTO,
  UpdateCategoriaInventarioDTO,
} from "./categoriaInventario.types.js";

async function ensureCodigoDisponible(codigo: string, excludeId?: number) {
  const existe = await prisma.categoriaInventario.findFirst({
    where: {
      codigo: {
        equals: codigo,
        mode: "insensitive",
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existe) {
    throw new HttpError("Ya existe una categoría con ese código", 409);
  }
}

async function validarPadre(parentId: number) {
  const parent = await prisma.categoriaInventario.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true },
  });

  if (!parent) {
    throw new HttpError("El grupo padre no existe", 404);
  }

  if (parent.parentId !== null) {
    throw new HttpError("Solo se permite un nivel de subgrupo (grupo -> subgrupo)", 400);
  }
}

export const categoriaInventarioService = {
  async getTree() {
    return prisma.categoriaInventario.findMany({
      where: { parentId: null },
      include: {
        children: {
          orderBy: [{ nombre: "asc" }],
        },
      },
      orderBy: [{ nombre: "asc" }],
    });
  },

  async getAll(query: CategoriaInventarioQueryDTO) {
    const where = query.parentId ? { parentId: query.parentId } : {};

    return prisma.categoriaInventario.findMany({
      where,
      include: {
        parent: true,
        children: true,
      },
      orderBy: [{ nombre: "asc" }],
    });
  },

  async getById(id: number) {
    return prisma.categoriaInventario.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: [{ nombre: "asc" }],
        },
        _count: {
          select: { productos: true },
        },
      },
    });
  },

  async create(data: CreateCategoriaInventarioDTO, userId: number) {
    await ensureCodigoDisponible(data.codigo);

    if (data.parentId) {
      await validarPadre(data.parentId);
    }

    const categoria = await prisma.categoriaInventario.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        ...(data.parentId ? { parent: { connect: { id: data.parentId } } } : {}),
      },
      include: {
        parent: true,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_CATEGORIA_INVENTARIO",
        data: { categoriaId: categoria.id, ...data },
      },
    });

    logger.info(
      { userId, categoriaId: categoria.id, action: "CREATE_CATEGORIA_INVENTARIO" },
      "Categoría de inventario creada",
    );

    return categoria;
  },

  async update(id: number, data: UpdateCategoriaInventarioDTO, userId: number) {
    const categoriaActual = await prisma.categoriaInventario.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    });

    if (!categoriaActual) {
      throw new HttpError("Categoría no encontrada", 404);
    }

    if (typeof data.codigo === "string") {
      await ensureCodigoDisponible(data.codigo, id);
    }

    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new HttpError("Una categoría no puede ser su propio padre", 400);
      }

      if (data.parentId !== null) {
        await validarPadre(data.parentId);
      }
    }

    const dataToUpdate: any = {
      ...(data.codigo !== undefined ? { codigo: data.codigo } : {}),
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
    };

    if (data.parentId !== undefined) {
      dataToUpdate.parent =
        data.parentId === null ? { disconnect: true } : { connect: { id: data.parentId } };
    }

    const categoria = await prisma.categoriaInventario.update({
      where: { id },
      data: dataToUpdate,
      include: {
        parent: true,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_CATEGORIA_INVENTARIO",
        data: { categoriaId: id, ...data },
      },
    });

    logger.info(
      { userId, categoriaId: id, action: "UPDATE_CATEGORIA_INVENTARIO" },
      "Categoría de inventario actualizada",
    );

    return categoria;
  },

  async remove(id: number, userId: number) {
    const categoria = await prisma.categoriaInventario.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            productos: true,
          },
        },
      },
    });

    if (!categoria) {
      throw new HttpError("Categoría no encontrada", 404);
    }

    if (categoria._count.children > 0) {
      throw new HttpError("No puedes eliminar un grupo que tiene subgrupos", 409);
    }

    if (categoria._count.productos > 0) {
      throw new HttpError("No puedes eliminar una categoría con productos asociados", 409);
    }

    await prisma.categoriaInventario.delete({
      where: { id },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "DELETE_CATEGORIA_INVENTARIO",
        data: { categoriaId: id },
      },
    });

    logger.info(
      { userId, categoriaId: id, action: "DELETE_CATEGORIA_INVENTARIO" },
      "Categoría de inventario eliminada",
    );
  },
};
