import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import type {
  BinCardQueryDTO,
  StockQueryDTO,
  ValesResumenQueryDTO,
  ComprasResumenQueryDTO,
  PeriodoRangoQueryDTO,
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

function generarRangoDeMeses(anioInicio: number, mesInicio: number, anioFin: number, mesFin: number) {
  const meses: { anio: number; mes: number }[] = [];
  let anio = anioInicio;
  let mes = mesInicio;
  while (anio < anioFin || (anio === anioFin && mes <= mesFin)) {
    meses.push({ anio, mes });
    mes++;
    if (mes > 12) { mes = 1; anio++; }
  }
  return meses;
}

export const reportesService = {
  async getBinCard(query: BinCardQueryDTO) {
    const where: any = {};
    if (query.productoId) where.productoId = query.productoId;
    const dateRange = buildDateRange(query);
    if (dateRange) where.createdAt = dateRange;

    const include = {
      usuarioEntrega: { select: { nombre: true } },
      producto: { select: { nombre: true } },
    };

    const mapMov = (mov: any): BinCardItem => ({
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
    });

    if (query.sinPaginar) {
      const movimientos = await prisma.movimiento.findMany({
        where, orderBy: { createdAt: "asc" }, include,
      });
      const items = movimientos.map(mapMov);
      logger.info({ query }, "Bin Card sin paginación generado");
      return { items, meta: { total: items.length } };
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({ where, skip, take: limit, orderBy: { createdAt: "asc" }, include }),
      prisma.movimiento.count({ where }),
    ]);

    const items = movimientos.map(mapMov);
    logger.info({ query, page, limit }, "Bin Card generado");
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getBinCardValorado(query: BinCardQueryDTO) {
    const where: any = {};
    if (query.productoId) where.productoId = query.productoId;
    const dateRange = buildDateRange(query);
    if (dateRange) where.createdAt = dateRange;

    const include = {
      usuarioEntrega: { select: { nombre: true } },
      producto: { select: { nombre: true } },
    };

    const mapMov = (mov: any): BinCardValoradoItem => ({
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
    });

    if (query.sinPaginar) {
      const movimientos = await prisma.movimiento.findMany({
        where, orderBy: { createdAt: "asc" }, include,
      });
      const items = movimientos.map(mapMov);
      logger.info({ query }, "Bin Card Valorado sin paginación generado");
      return { items, meta: { total: items.length } };
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({ where, skip, take: limit, orderBy: { createdAt: "asc" }, include }),
      prisma.movimiento.count({ where }),
    ]);

    const items = movimientos.map(mapMov);
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
    const where: any = {};
    if (query.estado) where.estado = query.estado;
    if (query.solicitanteId) where.solicitanteId = query.solicitanteId;
    const dateRange = buildDateRange(query);
    if (dateRange) where.createdAt = dateRange;

    const include = {
      solicitante: { select: { id: true, nombre: true, email: true } },
      superintendente: { select: { id: true, nombre: true } },
      almacenero: { select: { id: true, nombre: true } },
      items: {
        include: {
          producto: { select: { id: true, nombre: true, codigo: true } },
        },
      },
    };

    if (query.sinPaginar) {
      const vales = await prisma.vale.findMany({ where, orderBy: { createdAt: "desc" }, include });
      logger.info({ query }, "Reporte vales sin paginación generado");
      return { vales, meta: { total: vales.length } };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [vales, total] = await Promise.all([
      prisma.vale.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include }),
      prisma.vale.count({ where }),
    ]);

    logger.info({ query }, "Reporte vales generado");
    return { vales, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getComprasResumen(query: ComprasResumenQueryDTO) {
    const where: any = {};
    if (query.estado) where.estado = query.estado;
    if (query.proveedorId) where.proveedorId = query.proveedorId;
    const dateRange = buildDateRange(query);
    if (dateRange) where.createdAt = dateRange;

    const include = {
      proveedor: { select: { id: true, nombre: true } },
      usuarioRegistro: { select: { id: true, nombre: true } },
      usuarioRecibe: { select: { id: true, nombre: true } },
      items: {
        include: {
          producto: { select: { id: true, nombre: true, codigo: true } },
        },
      },
    };

    if (query.sinPaginar) {
      const compras = await prisma.compra.findMany({ where, orderBy: { createdAt: "desc" }, include });
      logger.info({ query }, "Reporte compras sin paginación generado");
      return { compras, meta: { total: compras.length } };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [compras, total] = await Promise.all([
      prisma.compra.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include }),
      prisma.compra.count({ where }),
    ]);

    logger.info({ query }, "Reporte compras generado");
    return { compras, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getComprasDetalle(query: ComprasResumenQueryDTO) {
    const where: any = {};
    if (query.estado) where.estado = query.estado;
    if (query.proveedorId) where.proveedorId = query.proveedorId;
    const dateRange = buildDateRange(query);
    if (dateRange) where.createdAt = dateRange;

    const include = {
      proveedor: true,
      usuarioRegistro: { select: { id: true, nombre: true } },
      usuarioRecibe: { select: { id: true, nombre: true } },
      anulacion: {
        include: { usuario: { select: { id: true, nombre: true } } },
      },
      items: {
        include: {
          producto: { select: { id: true, codigo: true, nombre: true, unidad: true } },
        },
      },
    };

    const mapCompra = (c: any) => {
      const descuentoPct = Number(c.descuento);
      const items = c.items.map((item: any) => {
        const cantidadRecibida = Number(item.cantidadRecibida);
        const precioUnit = Number(item.precioUnit);
        return {
          productoId: item.productoId,
          codigo: item.producto.codigo,
          nombre: item.producto.nombre,
          unidad: item.producto.unidad,
          cantidadPedida: Number(item.cantidadPedida),
          cantidadRecibida,
          precioUnit,
          subtotalBs: cantidadRecibida * precioUnit,
        };
      });

      const subtotalBs = items.reduce((acc: number, i: any) => acc + i.subtotalBs, 0);
      const descuentoBs = subtotalBs * (descuentoPct / 100);
      const totalBs = subtotalBs - descuentoBs;

      return {
        id: c.id,
        estado: c.estado,
        numeroFactura: c.numeroFactura ?? null,
        observacion: c.observacion ?? null,
        descuento: descuentoPct,
        createdAt: c.createdAt,
        recibidoAt: c.recibidoAt ?? null,
        fechaOperacion: c.fechaOperacion ?? null,
        proveedor: {
          id: c.proveedor.id,
          nombre: c.proveedor.nombre,
          razonSocial: c.proveedor.razonSocial ?? null,
          nit: c.proveedor.nit ?? null,
          contacto: c.proveedor.contacto ?? null,
          lugar: c.proveedor.lugar ?? null,
        },
        usuarioRegistro: c.usuarioRegistro,
        usuarioRecibe: c.usuarioRecibe ?? null,
        anulacion: c.anulacion
          ? {
              motivo: c.anulacion.motivo,
              creadoAt: c.anulacion.createdAt,
              usuario: c.anulacion.usuario,
            }
          : null,
        items,
        subtotalBs,
        descuentoBs,
        totalBs,
      };
    };

    if (query.sinPaginar) {
      const compras = await prisma.compra.findMany({ where, orderBy: { createdAt: "desc" }, include });
      const data = compras.map(mapCompra);
      const totalGeneral = data.reduce((acc, c) => acc + c.totalBs, 0);
      logger.info({ query }, "Reporte compras detalle sin paginación generado");
      return { compras: data, meta: { total: data.length }, totalGeneral };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [compras, total] = await Promise.all([
      prisma.compra.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include }),
      prisma.compra.count({ where }),
    ]);

    const data = compras.map(mapCompra);
    const totalGeneral = data.reduce((acc, c) => acc + c.totalBs, 0);

    logger.info({ query }, "Reporte compras detalle generado");
    return { compras: data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, totalGeneral };
  },

  async getBalanceMensual(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));

        const registros = await prisma.saldoMensual.findMany({
          where: { anio, mes },
          include: {
            producto: {
              include: { categoria: { include: { parent: true } } },
            },
          },
        });

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
          const grupo = cat.parent ?? cat;
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

        const grupos = [...grupoMap.values()].sort((a, b) =>
          a.grupoCodigo.localeCompare(b.grupoCodigo),
        );

        const totales = grupos.reduce(
          (acc, g) => ({
            saldoInicial: acc.saldoInicial + g.saldoInicial,
            ingresoMateriales: acc.ingresoMateriales + g.ingresoMateriales,
            salidaMateriales: acc.salidaMateriales + g.salidaMateriales,
            saldoFinal: acc.saldoFinal + g.saldoFinal,
          }),
          { saldoInicial: 0, ingresoMateriales: 0, salidaMateriales: 0, saldoFinal: 0 },
        );

        return { anio, mes, esCerrado, grupos, totales };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin, totalMeses: meses.length }, "Balance mensual por rango generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getInventarioAlmacen(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));

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

        const grupos = [...grupoMap.values()]
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
          .map((g) => ({
            codigo: g.codigo,
            nombre: g.nombre,
            totalBs: g.totalBs,
            subGrupos: [...g.subGrupos.values()].sort((a, b) => a.codigo.localeCompare(b.codigo)),
          }));

        const totalGeneral = grupos.reduce((acc, g) => acc + g.totalBs, 0);

        return { anio, mes, esCerrado, grupos, totalGeneral };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin, totalMeses: meses.length }, "Inventario almacén por rango generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getEntradasAlmacen(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));

        const registros = await prisma.saldoMensual.findMany({
          where: { anio, mes },
          include: {
            producto: {
              include: { categoria: { include: { parent: true } } },
            },
          },
          orderBy: { producto: { codigo: "asc" } },
        });

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
                  ingresoQty: number;
                  precioUnit: number;
                  totalBsEntrada: number;
                }>;
              }
            >;
            totalBsEntrada: number;
          }
        >();

        for (const r of registros) {
          const ingresoQty = Number(r.ingresoQty);
          if (ingresoQty === 0) continue;

          const cat = r.producto.categoria;
          const esSubGrupo = cat.parent !== null;
          const grupo = esSubGrupo ? cat.parent! : cat;
          const subGrupo = esSubGrupo ? cat : null;

          if (!grupoMap.has(grupo.id)) {
            grupoMap.set(grupo.id, { codigo: grupo.codigo, nombre: grupo.nombre, subGrupos: new Map(), totalBsEntrada: 0 });
          }

          const grupoEntry = grupoMap.get(grupo.id)!;
          const subGrupoId = subGrupo?.id ?? grupo.id;

          if (!grupoEntry.subGrupos.has(subGrupoId)) {
            grupoEntry.subGrupos.set(subGrupoId, {
              codigo: subGrupo?.codigo ?? grupo.codigo,
              nombre: subGrupo?.nombre ?? grupo.nombre,
              productos: [],
            });
          }

          const precioUnit = Number(r.precioUnit);
          const totalBsEntrada = ingresoQty * precioUnit;

          grupoEntry.subGrupos.get(subGrupoId)!.productos.push({
            codigo: r.producto.codigo,
            nombre: r.producto.nombre,
            unidad: r.producto.unidad,
            ingresoQty,
            precioUnit,
            totalBsEntrada,
          });
          grupoEntry.totalBsEntrada += totalBsEntrada;
        }

        const grupos = [...grupoMap.values()]
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
          .map((g) => ({
            codigo: g.codigo,
            nombre: g.nombre,
            totalBsEntrada: g.totalBsEntrada,
            subGrupos: [...g.subGrupos.values()].sort((a, b) => a.codigo.localeCompare(b.codigo)),
          }));

        const totalGeneral = grupos.reduce((acc, g) => acc + g.totalBsEntrada, 0);

        return { anio, mes, esCerrado, grupos, totalGeneral };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin, totalMeses: meses.length }, "Entradas almacén por rango generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getSalidasAlmacen(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));

        const registros = await prisma.saldoMensual.findMany({
          where: { anio, mes },
          include: {
            producto: {
              include: { categoria: { include: { parent: true } } },
            },
          },
          orderBy: { producto: { codigo: "asc" } },
        });

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
                  salidaQty: number;
                  precioUnit: number;
                  totalBsSalida: number;
                }>;
              }
            >;
            totalBsSalida: number;
          }
        >();

        for (const r of registros) {
          const salidaQty = Number(r.salidaQty);
          if (salidaQty === 0) continue;

          const cat = r.producto.categoria;
          const esSubGrupo = cat.parent !== null;
          const grupo = esSubGrupo ? cat.parent! : cat;
          const subGrupo = esSubGrupo ? cat : null;

          if (!grupoMap.has(grupo.id)) {
            grupoMap.set(grupo.id, { codigo: grupo.codigo, nombre: grupo.nombre, subGrupos: new Map(), totalBsSalida: 0 });
          }

          const grupoEntry = grupoMap.get(grupo.id)!;
          const subGrupoId = subGrupo?.id ?? grupo.id;

          if (!grupoEntry.subGrupos.has(subGrupoId)) {
            grupoEntry.subGrupos.set(subGrupoId, {
              codigo: subGrupo?.codigo ?? grupo.codigo,
              nombre: subGrupo?.nombre ?? grupo.nombre,
              productos: [],
            });
          }

          const precioUnit = Number(r.precioUnit);
          const totalBsSalida = salidaQty * precioUnit;

          grupoEntry.subGrupos.get(subGrupoId)!.productos.push({
            codigo: r.producto.codigo,
            nombre: r.producto.nombre,
            unidad: r.producto.unidad,
            salidaQty,
            precioUnit,
            totalBsSalida,
          });
          grupoEntry.totalBsSalida += totalBsSalida;
        }

        const grupos = [...grupoMap.values()]
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
          .map((g) => ({
            codigo: g.codigo,
            nombre: g.nombre,
            totalBsSalida: g.totalBsSalida,
            subGrupos: [...g.subGrupos.values()].sort((a, b) => a.codigo.localeCompare(b.codigo)),
          }));

        const totalGeneral = grupos.reduce((acc, g) => acc + g.totalBsSalida, 0);

        return { anio, mes, esCerrado, grupos, totalGeneral };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin, totalMeses: meses.length }, "Salidas almacén por rango generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },
};
