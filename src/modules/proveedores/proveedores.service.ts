import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreateProveedorDTO,
  UpdateProveedorDTO,
  ProveedorQueryDTO,
} from "./proveedores.types.js";

export const proveedoresService = {
  async createProveedor(data: CreateProveedorDTO, userId: number) {
    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: data.nombre,
        razonSocial: data.razonSocial ?? null,
        nit: data.nit ?? null,
        lugar: data.lugar ?? null,
        contacto: data.contacto ?? null,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_PROVEEDOR",
        data: { proveedorId: proveedor.id, ...data },
      },
    });

    logger.info(
      { userId, proveedorId: proveedor.id, action: "CREATE_PROVEEDOR" },
      "Proveedor creado",
    );

    return proveedor;
  },

  async getProveedores(query: ProveedorQueryDTO) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { nombre: { contains: query.search, mode: "insensitive" } },
        { razonSocial: { contains: query.search, mode: "insensitive" } },
        { nit: { contains: query.search, mode: "insensitive" } },
        { lugar: { contains: query.search, mode: "insensitive" } },
        { contacto: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [proveedores, total] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: "asc" },
      }),
      prisma.proveedor.count({ where }),
    ]);

    return {
      proveedores,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getProveedorById(id: number) {
    return prisma.proveedor.findUnique({
      where: { id },
      include: {
        compras: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            numeroFactura: true,
            estado: true,
            observacion: true,
            descuento: true,
            fechaOperacion: true,
            recibidoAt: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                cantidadPedida: true,
                cantidadRecibida: true,
                precioUnit: true,
                producto: { select: { id: true, codigo: true, nombre: true, unidad: true } },
              },
            },
          },
        },
      },
    });
  },

  async updateProveedor(id: number, data: UpdateProveedorDTO, userId: number) {
    const proveedor = await prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) {
      throw new HttpError("Proveedor no encontrado", 404);
    }

    const proveedorActualizado = await prisma.proveedor.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.razonSocial !== undefined && { razonSocial: data.razonSocial }),
        ...(data.nit !== undefined && { nit: data.nit }),
        ...(data.lugar !== undefined && { lugar: data.lugar }),
        ...(data.contacto !== undefined && { contacto: data.contacto }),
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_PROVEEDOR",
        data: { proveedorId: id, ...data },
      },
    });

    logger.info({ userId, proveedorId: id, action: "UPDATE_PROVEEDOR" }, "Proveedor actualizado");

    return proveedorActualizado;
  },

  async deleteProveedor(id: number, userId: number) {
    const proveedor = await prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) {
      throw new HttpError("Proveedor no encontrado", 404);
    }

    // Verificar si tiene compras asociadas
    const comprasCount = await prisma.compra.count({ where: { proveedorId: id } });
    if (comprasCount > 0) {
      throw new HttpError("No se puede eliminar un proveedor con compras asociadas", 409);
    }

    await prisma.proveedor.delete({ where: { id } });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "DELETE_PROVEEDOR",
        data: { proveedorId: id },
      },
    });

    logger.info({ userId, proveedorId: id, action: "DELETE_PROVEEDOR" }, "Proveedor eliminado");

    return { message: "Proveedor eliminado" };
  },
};
