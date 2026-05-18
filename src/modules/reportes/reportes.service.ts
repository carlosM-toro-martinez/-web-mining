import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import type {
  BinCardQueryDTO,
  StockQueryDTO,
  ValesResumenQueryDTO,
  ComprasResumenQueryDTO,
  PeriodoQueryDTO,
} from "./reportes.schema.js";
import type { BinCardItem, BinCardValoradoItem, StockItem } from "./reportes.types.js";

const startOfDayUTC = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const endOfDayUTC = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

function buildDateRange(query: { fecha?: Date | undefined; fechaInicio?: Date | undefined; fechaFin?: Date | undefined }) {
  if (query.fechaInicio || query.fechaFin) {
    const range: any = {};
    if (query.fechaInicio) range.gte = startOfDayUTC(query.fechaInicio);
    if (query.fechaFin) range.lte = endOfDayUTC(query.fechaFin);
    return range;
  }
  if (query.fecha) {
    return { gte: startOfDayUTC(query.fecha), lte: endOfDayUTC(query.fecha) };
  }
  return undefined;
}

export const reportesService = {
  async getBinCard(query: BinCardQueryDTO) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.productoId) where.productoId = query.productoId;
    const dateRange = buildDateRange(query);
    if (dateRange) where.createdAt = dateRange;

    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
        include: {
          usuarioEntrega: { select: { nombre: true } },
          producto: { select: { nombre: true } },
        },
      }),
      prisma.movimiento.count({ where }),
    ]);

    const items: BinCardItem[] = movimientos.map((mov) => ({
      id: mov.id,
      operationId: mov.operationId,
      fecha: mov.createdAt,
      tipo: mov.tipo,
      cantidad: Number(mov.cantidad),
      stockAntes: Number(mov.stockAntes),
      stockDespues: Number(mov.stockDespues),
      usuarioNombre: mov.usuarioEntrega?.nombre || "Desconocido",
      referencia: mov.referencia,
      referenciaId: mov.referenciaId,
      productoNombre: mov.producto.nombre,
    }));

    logger.info({ query, page, limit }, "Bin Card generado");
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getBinCardValorado(query: BinCardQueryDTO) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.productoId) where.productoId = query.productoId;
    const dateRange = buildDateRange(query);
    if (dateRange) where.createdAt = dateRange;

    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
        include: {
          usuarioEntrega: { select: { nombre: true } },
          producto: { select: { nombre: true } },
        },
      }),
      prisma.movimiento.count({ where }),
    ]);

    const items: BinCardValoradoItem[] = movimientos.map((mov) => ({
      id: mov.id,
      operationId: mov.operationId,
      fecha: mov.createdAt,
      tipo: mov.tipo,
      cantidad: Number(mov.cantidad),
      stockAntes: Number(mov.stockAntes),
      stockDespues: Number(mov.stockDespues),
      precioUnit: Number(mov.precioUnit),
      entradaBs: Number(mov.entradaBs),
      salidaBs: Number(mov.salidaBs),
      saldoBs: Number(mov.saldoBs),
      usuarioNombre: mov.usuarioEntrega?.nombre || "Desconocido",
      referencia: mov.referencia,
      referenciaId: mov.referenciaId,
      productoNombre: mov.producto.nombre,
    }));

    logger.info({ query, page, limit }, "Bin Card Valorado generado");
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getStockActual(query: StockQueryDTO) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.categoriaId) where.producto = { categoriaId: query.categoriaId };

    const [stocks, total] = await Promise.all([
      prisma.stock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { producto: { nombre: "asc" } },
        include: {
          producto: {
            include: { categoria: { select: { nombre: true } } },
          },
        },
      }),
      prisma.stock.count({ where }),
    ]);

    const items: StockItem[] = stocks.map((s) => {
      const cantidad = Number(s.cantidad);
      const reservada = Number(s.cantidadReservada);
      const precioUnit = Number(s.precioUnit);
      return {
        productoId: s.productoId,
        codigo: s.producto.codigo,
        nombre: s.producto.nombre,
        unidad: s.producto.unidad,
        categoria: s.producto.categoria.nombre,
        cantidad,
        cantidadReservada: reservada,
        cantidadDisponible: cantidad - reservada,
        precioUnit,
        precioProm: Number(s.precioProm),
        valorTotal: cantidad * precioUnit,
      };
    });

    logger.info({ query }, "Reporte stock actual generado");
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getValesResumen(query: ValesResumenQueryDTO) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.estado) where.estado = query.estado;
    if (query.solicitanteId) where.solicitanteId = query.solicitanteId;
    const dateRange = buildDateRange(query);
    if (dateRange) where.createdAt = dateRange;

    const [vales, total] = await Promise.all([
      prisma.vale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          solicitante: { select: { id: true, nombre: true, email: true } },
          superintendente: { select: { id: true, nombre: true } },
          almacenero: { select: { id: true, nombre: true } },
          items: {
            include: {
              producto: { select: { id: true, nombre: true, codigo: true } },
            },
          },
        },
      }),
      prisma.vale.count({ where }),
    ]);

    logger.info({ query }, "Reporte vales generado");
    return { vales, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getComprasResumen(query: ComprasResumenQueryDTO) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.estado) where.estado = query.estado;
    if (query.proveedorId) where.proveedorId = query.proveedorId;
    const dateRange = buildDateRange(query);
    if (dateRange) where.createdAt = dateRange;

    const [compras, total] = await Promise.all([
      prisma.compra.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          usuarioRegistro: { select: { id: true, nombre: true } },
          usuarioRecibe: { select: { id: true, nombre: true } },
          items: {
            include: {
              producto: { select: { id: true, nombre: true, codigo: true } },
            },
          },
        },
      }),
      prisma.compra.count({ where }),
    ]);

    logger.info({ query }, "Reporte compras generado");
    return { compras, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  // ── Balance mensual por grupo ─────────────────────────────────────────────
  async getBalanceMensual(query: PeriodoQueryDTO) {
    const { anio, mes } = query;

    const registros = await prisma.saldoMensual.findMany({
      where: { anio, mes },
      include: {
        producto: {
          include: {
            categoria: { include: { parent: true } },
          },
        },
      },
    });

    // Agrupar por grupo (categoría raíz)
    const grupoMap = new Map<
      number,
      {
        grupoCodigo: string;
        grupoNombre: string;
        saldoInicial: number;
        ingresoMateriales: number;
        salidaMateriales: number;
        saldoFinal: number;
      }
    >();

    for (const r of registros) {
      const cat = r.producto.categoria;
      const grupo = cat.parent ?? cat; // Si tiene padre, el padre es el grupo; si no, la categoría misma
      const grupoId = grupo.id;

      if (!grupoMap.has(grupoId)) {
        grupoMap.set(grupoId, {
          grupoCodigo: grupo.codigo,
          grupoNombre: grupo.nombre,
          saldoInicial: 0,
          ingresoMateriales: 0,
          salidaMateriales: 0,
          saldoFinal: 0,
        });
      }

      const entry = grupoMap.get(grupoId)!;
      entry.saldoInicial += Number(r.saldoInicial) * Number(r.precioUnit);
      entry.ingresoMateriales += Number(r.ingresoQty) * Number(r.precioUnit);
      entry.salidaMateriales += Number(r.salidaQty) * Number(r.precioUnit);
      entry.saldoFinal += Number(r.totalBs);
    }

    const items = [...grupoMap.values()].sort((a, b) =>
      a.grupoCodigo.localeCompare(b.grupoCodigo),
    );

    const totales = items.reduce(
      (acc, g) => ({
        saldoInicial: acc.saldoInicial + g.saldoInicial,
        ingresoMateriales: acc.ingresoMateriales + g.ingresoMateriales,
        salidaMateriales: acc.salidaMateriales + g.salidaMateriales,
        saldoFinal: acc.saldoFinal + g.saldoFinal,
      }),
      { saldoInicial: 0, ingresoMateriales: 0, salidaMateriales: 0, saldoFinal: 0 },
    );

    logger.info({ anio, mes, grupos: items.length }, "Balance mensual generado");
    return { anio, mes, items, totales };
  },

  // ── Inventario almacén por producto (jerárquico) ──────────────────────────
  async getInventarioAlmacen(query: PeriodoQueryDTO) {
    const { anio, mes } = query;

    const registros = await prisma.saldoMensual.findMany({
      where: { anio, mes },
      include: {
        producto: {
          include: {
            categoria: { include: { parent: true } },
          },
        },
      },
      orderBy: { producto: { codigo: "asc" } },
    });

    // Estructura jerárquica: grupo → subGrupo → productos
    const grupoMap = new Map<
      number,
      {
        codigo: string;
        nombre: string;
        subGrupos: Map<
          number,
          {
            codigo: string;
            nombre: string;
            productos: Array<{
              codigo: string;
              nombre: string;
              unidad: string;
              saldoInicial: number;
              ingresoQty: number;
              salidaQty: number;
              saldoFinal: number;
              precioUnit: number;
              totalBs: number;
            }>;
          }
        >;
        totalBs: number;
      }
    >();

    for (const r of registros) {
      const cat = r.producto.categoria;
      const esSubGrupo = cat.parent !== null;
      const grupo = esSubGrupo ? cat.parent! : cat;
      const subGrupo = esSubGrupo ? cat : null;

      if (!grupoMap.has(grupo.id)) {
        grupoMap.set(grupo.id, {
          codigo: grupo.codigo,
          nombre: grupo.nombre,
          subGrupos: new Map(),
          totalBs: 0,
        });
      }

      const grupoEntry = grupoMap.get(grupo.id)!;
      const subGrupoId = subGrupo?.id ?? grupo.id;
      const subGrupoCodigo = subGrupo?.codigo ?? grupo.codigo;
      const subGrupoNombre = subGrupo?.nombre ?? grupo.nombre;

      if (!grupoEntry.subGrupos.has(subGrupoId)) {
        grupoEntry.subGrupos.set(subGrupoId, {
          codigo: subGrupoCodigo,
          nombre: subGrupoNombre,
          productos: [],
        });
      }

      const totalBs = Number(r.totalBs);
      grupoEntry.subGrupos.get(subGrupoId)!.productos.push({
        codigo: r.producto.codigo,
        nombre: r.producto.nombre,
        unidad: r.producto.unidad,
        saldoInicial: Number(r.saldoInicial),
        ingresoQty: Number(r.ingresoQty),
        salidaQty: Number(r.salidaQty),
        saldoFinal: Number(r.saldoFinal),
        precioUnit: Number(r.precioUnit),
        totalBs,
      });
      grupoEntry.totalBs += totalBs;
    }

    const grupos = [...grupoMap.values()].sort((a, b) => a.codigo.localeCompare(b.codigo)).map((g) => ({
      codigo: g.codigo,
      nombre: g.nombre,
      totalBs: g.totalBs,
      subGrupos: [...g.subGrupos.values()].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    }));

    const totalGeneral = grupos.reduce((acc, g) => acc + g.totalBs, 0);

    logger.info({ anio, mes, grupos: grupos.length }, "Inventario almacén generado");
    return { anio, mes, grupos, totalGeneral };
  },
};
