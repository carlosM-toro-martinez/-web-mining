import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../errors/http.error.js";
import { logger } from "../../config/logger.js";
import type {
  CrearAsignacionDTO,
  ActualizarAsignacionDTO,
  AsignacionesQueryDTO,
  ProductosEppQueryDTO,
  TrabajadoresQueryDTO,
} from "./epp.schema.js";

// ──────────────────────────────────────────
// Include helpers
// ──────────────────────────────────────────

const productoInclude = {
  categoria: { include: { parent: true } },
  stock: { select: { cantidad: true, precioUnit: true } },
} as const;

const asignacionInclude = {
  producto: { include: productoInclude },
  usuario: { select: { id: true, nombre: true, email: true, role: true } },
} as const;

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function mapProducto(p: any) {
  const cat     = p.categoria;
  const grupo   = cat.parent !== null ? cat.parent : cat;
  const subGrupo = cat.parent !== null ? cat : null;
  return {
    id:       p.id,
    codigo:   p.codigo,
    nombre:   p.nombre,
    unidad:   p.unidad,
    grupo:    { id: grupo.id, codigo: grupo.codigo, nombre: grupo.nombre },
    subGrupo: subGrupo ? { id: subGrupo.id, codigo: subGrupo.codigo, nombre: subGrupo.nombre } : null,
    stock: {
      cantidad:   p.stock ? Number(p.stock.cantidad) : 0,
      precioUnit: p.stock ? Number(p.stock.precioUnit) : 0,
    },
  };
}

function mapAsignacion(a: any) {
  return {
    id:              a.id,
    condicion:       a.condicion,
    observacion:     a.observacion ?? null,
    fechaEntrega:    a.fechaEntrega,
    fechaDevolucion: a.fechaDevolucion ?? null,
    activa:          a.fechaDevolucion === null,
    producto:        mapProducto(a.producto),
    usuario:         a.usuario,
  };
}

// ──────────────────────────────────────────
// Service
// ──────────────────────────────────────────

export const eppService = {

  // ── 1. Productos EPP ──────────────────────────────────────────────────────

  async getProductosEpp(query: ProductosEppQueryDTO) {
    const where: any = { esEpp: true };
    if (query.categoriaId) where.categoriaId = query.categoriaId;
    if (query.search) {
      where.OR = [
        { nombre: { contains: query.search, mode: "insensitive" } },
        { codigo: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const productos = await prisma.producto.findMany({
      where,
      include: {
        ...productoInclude,
        eppAsignaciones: {
          where: { fechaDevolucion: null },
          select: { id: true, condicion: true, usuario: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: [{ categoria: { codigo: "asc" } }, { codigo: "asc" }],
    });

    const data = productos.map((p) => ({
      ...mapProducto(p),
      asignacionesActivas: (p as any).eppAsignaciones.map((a: any) => ({
        asignacionId: a.id,
        condicion:    a.condicion,
        usuario:      a.usuario,
      })),
      totalAsignacionesActivas: (p as any).eppAsignaciones.length,
    }));

    logger.info({ total: data.length }, "Productos EPP listados");
    return { total: data.length, productos: data };
  },

  // ── 2. Asignaciones (con filtros) ─────────────────────────────────────────

  async getAsignaciones(query: AsignacionesQueryDTO) {
    const where: any = {};
    if (query.productoId) where.productoId = query.productoId;
    if (query.usuarioId)  where.usuarioId  = query.usuarioId;
    if (query.condicion)  where.condicion  = query.condicion;
    if (query.activa === true)  where.fechaDevolucion = null;
    if (query.activa === false) where.fechaDevolucion = { not: null };

    if (query.sinPaginar) {
      const asignaciones = await prisma.eppAsignacion.findMany({
        where,
        include: asignacionInclude,
        orderBy: { fechaEntrega: "desc" },
      });
      return { total: asignaciones.length, asignaciones: asignaciones.map(mapAsignacion) };
    }

    const skip  = (query.page - 1) * query.limit;
    const [asignaciones, total] = await Promise.all([
      prisma.eppAsignacion.findMany({
        where, skip, take: query.limit,
        include: asignacionInclude,
        orderBy: { fechaEntrega: "desc" },
      }),
      prisma.eppAsignacion.count({ where }),
    ]);

    return {
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      asignaciones: asignaciones.map(mapAsignacion),
    };
  },

  // ── 3. Historial de un EPP específico (rastreo del último dueño) ──────────

  async getHistorialProducto(productoId: number) {
    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      include: productoInclude,
    });
    if (!producto) throw new HttpError("Producto no encontrado", 404);
    if (!producto.esEpp) throw new HttpError("El producto no es un EPP", 400);

    const asignaciones = await prisma.eppAsignacion.findMany({
      where: { productoId },
      include: asignacionInclude,
      orderBy: { fechaEntrega: "desc" },
    });

    // Entradas desde vales completados
    const valeItems = await prisma.valeItem.findMany({
      where: {
        productoId,
        cantidadEntregada: { gt: 0 },
        vale: { estado: "COMPLETADO" },
      },
      include: {
        vale: {
          select: {
            id: true,
            entregadoAt: true,
            fechaOperacion: true,
            createdAt: true,
            solicitante: { select: { id: true, nombre: true, email: true } },
            almacenero:  { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { vale: { entregadoAt: "desc" } },
    });

    const propietarioActual = asignaciones.find((a) => a.fechaDevolucion === null) ?? null;

    return {
      producto:         mapProducto(producto),
      propietarioActual: propietarioActual ? mapAsignacion(propietarioActual) : null,
      asignaciones:     asignaciones.map(mapAsignacion),
      entregasVale:     valeItems.map((vi) => ({
        valeId:           vi.vale.id,
        cantidadEntregada: Number(vi.cantidadEntregada),
        fecha:            vi.vale.fechaOperacion ?? vi.vale.entregadoAt ?? vi.vale.createdAt,
        solicitante:      vi.vale.solicitante,
        almacenero:       vi.vale.almacenero ?? null,
      })),
    };
  },

  // ── 4. Reporte por trabajador ─────────────────────────────────────────────

  async getReporteTrabajador(usuarioId: number) {
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: { id: true, nombre: true, email: true, role: true },
    });
    if (!usuario) throw new HttpError("Usuario no encontrado", 404);

    // Asignaciones activas y devueltas
    const asignaciones = await prisma.eppAsignacion.findMany({
      where: { usuarioId },
      include: asignacionInclude,
      orderBy: { fechaEntrega: "desc" },
    });

    // Historial de entregas vía vales
    const valeItems = await prisma.valeItem.findMany({
      where: {
        cantidadEntregada: { gt: 0 },
        vale: {
          solicitanteId: usuarioId,
          estado: "COMPLETADO",
        },
        producto: { esEpp: true },
      },
      include: {
        producto: { include: productoInclude },
        vale: {
          select: {
            id: true,
            entregadoAt: true,
            fechaOperacion: true,
            createdAt: true,
            almacenero: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { vale: { entregadoAt: "desc" } },
    });

    const activas   = asignaciones.filter((a) => a.fechaDevolucion === null).map(mapAsignacion);
    const devueltas = asignaciones.filter((a) => a.fechaDevolucion !== null).map(mapAsignacion);

    const historialVales = valeItems.map((vi) => ({
      valeId:           vi.vale.id,
      fecha:            vi.vale.fechaOperacion ?? vi.vale.entregadoAt ?? vi.vale.createdAt,
      almacenero:       vi.vale.almacenero ?? null,
      producto:         mapProducto(vi.producto),
      cantidadEntregada: Number(vi.cantidadEntregada),
    }));

    logger.info({ usuarioId, activas: activas.length, historial: historialVales.length }, "Reporte EPP trabajador");
    return { usuario, asignacionesActivas: activas, asignacionesDevueltas: devueltas, historialVales };
  },

  // ── 5. Trabajadores con EPPs asignados ───────────────────────────────────

  async getTrabajadoresConEpp(query: TrabajadoresQueryDTO) {
    const asignacionWhere: any = {};
    if (query.soloActivos) asignacionWhere.fechaDevolucion = null;

    // IDs de usuarios que tienen alguna asignación
    const usuariosConAsignacion = await prisma.eppAsignacion.findMany({
      where: asignacionWhere,
      select: { usuarioId: true },
      distinct: ["usuarioId"],
    });

    const usuarioIds = usuariosConAsignacion.map((u) => u.usuarioId);
    if (usuarioIds.length === 0) return { total: 0, trabajadores: [] };

    const userWhere: any = { id: { in: usuarioIds } };
    if (query.search) {
      userWhere.OR = [
        { nombre: { contains: query.search, mode: "insensitive" } },
        { email:  { contains: query.search, mode: "insensitive" } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [usuarios, total] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        skip,
        take: query.limit,
        select: { id: true, nombre: true, email: true, role: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.user.count({ where: userWhere }),
    ]);

    // Para cada usuario, traer el resumen de asignaciones
    const trabajadores = await Promise.all(
      usuarios.map(async (u) => {
        const [activas, total_] = await Promise.all([
          prisma.eppAsignacion.count({ where: { usuarioId: u.id, fechaDevolucion: null } }),
          prisma.eppAsignacion.count({ where: { usuarioId: u.id } }),
        ]);
        const ultimaAsignacion = await prisma.eppAsignacion.findFirst({
          where: { usuarioId: u.id },
          orderBy: { fechaEntrega: "desc" },
          select: { fechaEntrega: true, producto: { select: { nombre: true } } },
        });
        return {
          usuario:          u,
          asignacionesActivas: activas,
          totalAsignaciones:   total_,
          ultimaEntrega:    ultimaAsignacion
            ? { fecha: ultimaAsignacion.fechaEntrega, producto: ultimaAsignacion.producto.nombre }
            : null,
        };
      }),
    );

    logger.info({ total }, "Trabajadores con EPP listados");
    return {
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      trabajadores,
    };
  },

  // ── 6. Crear asignación ───────────────────────────────────────────────────

  async createAsignacion(data: CrearAsignacionDTO) {
    const producto = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!producto)       throw new HttpError("Producto no encontrado", 404);
    if (!producto.esEpp) throw new HttpError("El producto no es un EPP", 400);

    const usuario = await prisma.user.findUnique({ where: { id: data.usuarioId } });
    if (!usuario) throw new HttpError("Usuario no encontrado", 404);

    const asignacion = await prisma.eppAsignacion.create({
      data: {
        productoId:  data.productoId,
        usuarioId:   data.usuarioId,
        condicion:   data.condicion,
        observacion: data.observacion ?? null,
        ...(data.fechaEntrega ? { fechaEntrega: new Date(data.fechaEntrega) } : {}),
      },
      include: asignacionInclude,
    });

    logger.info({ id: asignacion.id, productoId: data.productoId, usuarioId: data.usuarioId }, "EPP asignado");
    return mapAsignacion(asignacion);
  },

  // ── 7. Actualizar asignación (devolver, cambiar condición) ────────────────

  async updateAsignacion(id: string, data: ActualizarAsignacionDTO) {
    const existente = await prisma.eppAsignacion.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Asignación no encontrada", 404);

    const actualizado = await prisma.eppAsignacion.update({
      where: { id },
      data: {
        ...(data.fechaDevolucion !== undefined ? { fechaDevolucion: new Date(data.fechaDevolucion) } : {}),
        ...(data.condicion    !== undefined ? { condicion:    data.condicion    } : {}),
        ...(data.observacion  !== undefined ? { observacion:  data.observacion  } : {}),
      },
      include: asignacionInclude,
    });

    logger.info({ id, changes: data }, "EPP asignación actualizada");
    return mapAsignacion(actualizado);
  },

  // ── 8. Eliminar asignación ────────────────────────────────────────────────

  async deleteAsignacion(id: string) {
    const existente = await prisma.eppAsignacion.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Asignación no encontrada", 404);

    await prisma.eppAsignacion.delete({ where: { id } });
    logger.info({ id }, "EPP asignación eliminada");
  },
};
