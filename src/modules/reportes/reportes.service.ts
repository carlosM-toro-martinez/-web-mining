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
    where.estado = query.estado ? query.estado : { not: "ANULADO" };
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
    where.estado = query.estado ? query.estado : { not: "ANULADA" };
    if (query.proveedorId) where.proveedorId = query.proveedorId;
    const dateRange = buildDateRange(query);
    if (dateRange) {
      where.OR = [
        { fechaOperacion: dateRange },
        { fechaOperacion: null, createdAt: dateRange },
      ];
    }

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
    where.estado = query.estado ? query.estado : { not: "ANULADA" };
    if (query.proveedorId) where.proveedorId = query.proveedorId;
    const dateRange = buildDateRange(query);
    if (dateRange) {
      where.OR = [
        { fechaOperacion: dateRange },
        { fechaOperacion: null, createdAt: dateRange },
      ];
    }

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

        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        const movFilter = {
          OR: [
            { periodoAnio: anio, periodoMes: mes },
            { periodoAnio: null as null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
          ],
        };

        const [registros, compraItemsRaw, salidasMovs] = await Promise.all([
          prisma.saldoMensual.findMany({
            where: { anio, mes },
            include: { producto: { include: { categoria: { include: { parent: true } } } } },
          }),
          prisma.compraItem.findMany({
            where: {
              cantidadRecibida: { gt: 0 },
              compra: {
                estado: { not: "ANULADA" },
                OR: [
                  { fechaOperacion: { gte: startOfMonth, lt: endOfMonth } },
                  { fechaOperacion: null, recibidoAt: { gte: startOfMonth, lt: endOfMonth } },
                  { fechaOperacion: null, recibidoAt: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
                ],
              },
            },
            select: { productoId: true, cantidadRecibida: true, precioUnit: true },
          }),
          prisma.movimiento.findMany({
            where: { tipo: "SALIDA", referencia: { not: "ANULACION_COMPRA" }, ...movFilter },
            select: { productoId: true, cantidad: true, salidaBs: true },
          }),
        ]);

        const ingresoMap = new Map<number, { qty: number; bs: number }>();
        for (const item of compraItemsRaw) {
          const e = ingresoMap.get(item.productoId) ?? { qty: 0, bs: 0 };
          e.qty += Number(item.cantidadRecibida);
          e.bs  += Number(item.cantidadRecibida) * Number(item.precioUnit);
          ingresoMap.set(item.productoId, e);
        }

        const salidaMap = new Map<number, { qty: number; bs: number }>();
        for (const mov of salidasMovs) {
          const e = salidaMap.get(mov.productoId) ?? { qty: 0, bs: 0 };
          e.qty += Number(mov.cantidad);
          e.bs  += Number(mov.salidaBs);
          salidaMap.set(mov.productoId, e);
        }

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

          const precioUnit   = Number(r.precioUnit);
          const saldoInicial = Number(r.saldoInicial);
          const ingresos     = ingresoMap.get(r.productoId) ?? { qty: Number(r.ingresoQty), bs: Number(r.ingresoQty) * precioUnit };
          const salidas      = salidaMap.has(r.productoId) ? salidaMap.get(r.productoId)! : { qty: Number(r.salidaQty), bs: Number(r.salidaQty) * precioUnit };
          const saldoFinalQty = saldoInicial + ingresos.qty - salidas.qty;

          const entry = grupoMap.get(grupoId)!;
          entry.saldoInicial      += saldoInicial * precioUnit;
          entry.ingresoMateriales += ingresos.bs;
          entry.salidaMateriales  += salidas.bs;
          entry.saldoFinal        += saldoFinalQty * precioUnit;
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

        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        const movFilter = {
          OR: [
            { periodoAnio: anio, periodoMes: mes },
            { periodoAnio: null as null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
          ],
        };

        const [registros, compraItemsRaw, salidasMovs] = await Promise.all([
          prisma.saldoMensual.findMany({
            where: { anio, mes },
            include: { producto: { include: { categoria: { include: { parent: true } } } } },
            orderBy: { producto: { codigo: "asc" } },
          }),
          prisma.compraItem.findMany({
            where: {
              cantidadRecibida: { gt: 0 },
              compra: {
                estado: { not: "ANULADA" },
                OR: [
                  { fechaOperacion: { gte: startOfMonth, lt: endOfMonth } },
                  { fechaOperacion: null, recibidoAt: { gte: startOfMonth, lt: endOfMonth } },
                  { fechaOperacion: null, recibidoAt: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
                ],
              },
            },
            select: { productoId: true, cantidadRecibida: true },
          }),
          prisma.movimiento.findMany({
            where: { tipo: "SALIDA", referencia: { not: "ANULACION_COMPRA" }, ...movFilter },
            select: { productoId: true, cantidad: true },
          }),
        ]);

        const ingresoMap = new Map<number, number>();
        for (const item of compraItemsRaw) {
          ingresoMap.set(item.productoId, (ingresoMap.get(item.productoId) ?? 0) + Number(item.cantidadRecibida));
        }

        const salidaMap = new Map<number, number>();
        for (const mov of salidasMovs) {
          salidaMap.set(mov.productoId, (salidaMap.get(mov.productoId) ?? 0) + Number(mov.cantidad));
        }

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
            grupoMap.set(grupo.id, { codigo: grupo.codigo, nombre: grupo.nombre, subGrupos: new Map(), totalBs: 0 });
          }

          const grupoEntry   = grupoMap.get(grupo.id)!;
          const subGrupoId   = subGrupo?.id ?? grupo.id;

          if (!grupoEntry.subGrupos.has(subGrupoId)) {
            grupoEntry.subGrupos.set(subGrupoId, {
              codigo: subGrupo?.codigo ?? grupo.codigo,
              nombre: subGrupo?.nombre ?? grupo.nombre,
              productos: [],
            });
          }

          const ingresoQty   = ingresoMap.get(r.productoId) ?? Number(r.ingresoQty);
          const salidaQty    = salidaMap.has(r.productoId) ? salidaMap.get(r.productoId)! : Number(r.salidaQty);
          const saldoInicial = Number(r.saldoInicial);
          const saldoFinal   = saldoInicial + ingresoQty - salidaQty;
          const precioUnit   = Number(r.precioUnit);
          const totalBs      = saldoFinal * precioUnit;

          grupoEntry.subGrupos.get(subGrupoId)!.productos.push({
            codigo: r.producto.codigo,
            nombre: r.producto.nombre,
            unidad: r.producto.unidad,
            saldoInicial,
            ingresoQty,
            salidaQty,
            saldoFinal,
            precioUnit,
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

        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        // Fuente: CompraItem con precio real de compra, excluyendo compras anuladas.
        // La fecha se toma de fechaOperacion, luego recibidoAt, luego createdAt (igual que otros reportes).
        const compraItems = await prisma.compraItem.findMany({
          where: {
            cantidadRecibida: { gt: 0 },
            compra: {
              estado: { not: "ANULADA" },
              OR: [
                { fechaOperacion: { gte: startOfMonth, lt: endOfMonth } },
                { fechaOperacion: null, recibidoAt: { gte: startOfMonth, lt: endOfMonth } },
                { fechaOperacion: null, recibidoAt: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
              ],
            },
          },
          include: {
            producto: {
              include: { categoria: { include: { parent: true } } },
            },
          },
        });

        // Agregar por producto usando el precioUnit real de cada CompraItem
        const prodMap = new Map<
          number,
          { producto: (typeof compraItems)[0]["producto"]; ingresoQty: number; ingresosBs: number }
        >();

        for (const item of compraItems) {
          const pid = item.productoId;
          if (!prodMap.has(pid)) {
            prodMap.set(pid, { producto: item.producto, ingresoQty: 0, ingresosBs: 0 });
          }
          const entry = prodMap.get(pid)!;
          const qty    = Number(item.cantidadRecibida);
          const precio = Number(item.precioUnit);
          entry.ingresoQty += qty;
          entry.ingresosBs += qty * precio;
        }

        const grupoMap = new Map<
          number,
          {
            codigo: string;
            nombre: string;
            subGrupos: Map<number, {
              codigo: string;
              nombre: string;
              productos: Array<{ codigo: string; nombre: string; unidad: string; ingresoQty: number; precioUnit: number; totalBsEntrada: number }>;
            }>;
            totalBsEntrada: number;
          }
        >();

        for (const { producto, ingresoQty, ingresosBs } of prodMap.values()) {
          const cat       = producto.categoria;
          const esSubGrupo = cat.parent !== null;
          const grupo     = esSubGrupo ? cat.parent! : cat;
          const subGrupo  = esSubGrupo ? cat : null;

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

          // precioUnit = promedio ponderado real de las compras del período
          const precioUnit     = Math.round((ingresosBs / ingresoQty) * 100) / 100;
          const totalBsEntrada = Math.round(ingresosBs * 100) / 100;

          grupoEntry.subGrupos.get(subGrupoId)!.productos.push({
            codigo: producto.codigo,
            nombre: producto.nombre,
            unidad: producto.unidad,
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
            totalBsEntrada:         Math.round(g.totalBsEntrada * 100) / 100,
            totalBsEntradaMenos13:  Math.round(g.totalBsEntrada * 0.87 * 100) / 100,
            subGrupos: [...g.subGrupos.values()]
              .sort((a, b) => a.codigo.localeCompare(b.codigo))
              .map((sg) => ({
                ...sg,
                productos: sg.productos.sort((a, b) => a.codigo.localeCompare(b.codigo)),
              })),
          }));

        const totalGeneral        = Math.round(grupos.reduce((acc, g) => acc + g.totalBsEntrada, 0) * 100) / 100;
        const totalGeneralMenos13 = Math.round(totalGeneral * 0.87 * 100) / 100;

        return { anio, mes, esCerrado, grupos, totalGeneral, totalGeneralMenos13 };
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

        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth = new Date(Date.UTC(anio, mes, 1));

        const movimientos = await prisma.movimiento.findMany({
          where: {
            tipo: "SALIDA",
            referencia: { not: "ANULACION_COMPRA" },
            OR: [
              { periodoAnio: anio, periodoMes: mes },
              { periodoAnio: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
            ],
          },
          include: {
            producto: {
              include: { categoria: { include: { parent: true } } },
            },
          },
        });

        // Precios históricos del SaldoMensual del período
        const saldosMes = await prisma.saldoMensual.findMany({
          where: { anio, mes },
          select: { productoId: true, precioUnit: true },
        });
        const precioHistoricoMap = new Map<number, number>(
          saldosMes.map((s) => [s.productoId, Number(s.precioUnit)]),
        );

        // Agregar por producto
        const prodMap = new Map<number, { producto: typeof movimientos[0]["producto"]; salidaQty: number }>();
        for (const mov of movimientos) {
          const pid = mov.productoId;
          if (!prodMap.has(pid)) {
            prodMap.set(pid, { producto: mov.producto, salidaQty: 0 });
          }
          prodMap.get(pid)!.salidaQty += Number(mov.cantidad);
        }

        const grupoMap = new Map<
          number,
          {
            codigo: string;
            nombre: string;
            subGrupos: Map<number, { codigo: string; nombre: string; productos: Array<{ codigo: string; nombre: string; unidad: string; salidaQty: number; precioUnit: number; totalBsSalida: number }> }>;
            totalBsSalida: number;
          }
        >();

        for (const { producto, salidaQty } of prodMap.values()) {
          const cat = producto.categoria;
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

          // Usar precio histórico del SaldoMensual del período
          const precioUnit = precioHistoricoMap.get(producto.id) ?? 0;
          const totalBsSalida = Math.round(salidaQty * precioUnit * 100) / 100;

          grupoEntry.subGrupos.get(subGrupoId)!.productos.push({
            codigo: producto.codigo,
            nombre: producto.nombre,
            unidad: producto.unidad,
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
            totalBsSalida:        Math.round(g.totalBsSalida * 100) / 100,
            totalBsSalidaMenos13: Math.round(g.totalBsSalida * 0.87 * 100) / 100,
            subGrupos: [...g.subGrupos.values()]
              .sort((a, b) => a.codigo.localeCompare(b.codigo))
              .map((sg) => ({
                ...sg,
                productos: sg.productos.sort((a, b) => a.codigo.localeCompare(b.codigo)),
              })),
          }));

        const totalGeneral        = Math.round(grupos.reduce((acc, g) => acc + g.totalBsSalida, 0) * 100) / 100;
        const totalGeneralMenos13 = Math.round(totalGeneral * 0.87 * 100) / 100;

        return { anio, mes, esCerrado, grupos, totalGeneral, totalGeneralMenos13 };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin, totalMeses: meses.length }, "Salidas almacén por rango generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getComprasProveedor(query: ComprasResumenQueryDTO) {
    const IVA = 0.13;

    const where: any = {};
    where.estado = query.estado ? query.estado : { not: "ANULADA" };
    if (query.proveedorId) where.proveedorId = query.proveedorId;
    const dateRange = buildDateRange(query);
    if (dateRange) {
      where.OR = [
        { fechaOperacion: dateRange },
        { fechaOperacion: null, createdAt: dateRange },
      ];
    }

    const include = {
      proveedor: { select: { id: true, nombre: true, razonSocial: true, nit: true, contacto: true, lugar: true } },
      usuarioRegistro: { select: { id: true, nombre: true } },
      usuarioRecibe: { select: { id: true, nombre: true } },
      anulacion: { include: { usuario: { select: { id: true, nombre: true } } } },
      items: {
        include: {
          producto: { select: { id: true, codigo: true, nombre: true, unidad: true } },
        },
        orderBy: { id: "asc" as const },
      },
    };

    const mapCompra = (c: any) => {
      const descuentoPct = Number(c.descuento ?? 0);
      const items = c.items.map((item: any) => {
        const cantidadRecibida = Number(item.cantidadRecibida);
        const precioUnit       = Number(item.precioUnit);
        const totalBs          = cantidadRecibida * precioUnit;
        const totalSinIVA      = totalBs * (1 - IVA);
        return {
          productoId:       item.productoId,
          codigo:           item.producto.codigo,
          nombre:           item.producto.nombre,
          unidad:           item.producto.unidad,
          cantidadPedida:   Number(item.cantidadPedida),
          cantidadRecibida,
          precioUnit,
          totalBs:          Math.round(totalBs * 100) / 100,
          totalSinIVA:      Math.round(totalSinIVA * 100) / 100,
        };
      });

      const subtotalBs   = items.reduce((acc: number, i: any) => acc + i.totalBs, 0);
      const descuentoBs  = subtotalBs * (descuentoPct / 100);
      const totalBs      = subtotalBs - descuentoBs;
      const totalSinIVA  = Math.round(totalBs * (1 - IVA) * 100) / 100;

      return {
        id:             c.id,
        estado:         c.estado,
        numeroFactura:  c.numeroFactura ?? null,
        observacion:    c.observacion ?? null,
        fechaOperacion: c.fechaOperacion ?? null,
        createdAt:      c.createdAt,
        recibidoAt:     c.recibidoAt ?? null,
        descuento:      descuentoPct,
        proveedor:      c.proveedor,
        usuarioRegistro: c.usuarioRegistro,
        usuarioRecibe:  c.usuarioRecibe ?? null,
        anulacion:      c.anulacion
          ? { motivo: c.anulacion.motivo, creadoAt: c.anulacion.createdAt, usuario: c.anulacion.usuario }
          : null,
        items,
        subtotalBs:    Math.round(subtotalBs * 100) / 100,
        descuentoBs:   Math.round(descuentoBs * 100) / 100,
        totalBs:       Math.round(totalBs * 100) / 100,
        totalSinIVA,
      };
    };

    if (query.sinPaginar) {
      const compras = await prisma.compra.findMany({
        where,
        orderBy: [{ proveedor: { nombre: "asc" } }, { fechaOperacion: "asc" }, { createdAt: "asc" }],
        include,
      });
      const data        = compras.map(mapCompra);
      const totalGeneral      = data.reduce((acc, c) => acc + c.totalBs, 0);
      const totalGeneralSinIVA = Math.round(totalGeneral * (1 - IVA) * 100) / 100;
      logger.info({ query }, "Reporte compras-proveedor sin paginación generado");
      return { compras: data, meta: { total: data.length }, totalGeneral: Math.round(totalGeneral * 100) / 100, totalGeneralSinIVA };
    }

    const page  = query.page || 1;
    const limit = query.limit || 20;
    const skip  = (page - 1) * limit;

    const [compras, total] = await Promise.all([
      prisma.compra.findMany({
        where, skip, take: limit,
        orderBy: [{ proveedor: { nombre: "asc" } }, { fechaOperacion: "asc" }, { createdAt: "asc" }],
        include,
      }),
      prisma.compra.count({ where }),
    ]);

    const data             = compras.map(mapCompra);
    const totalGeneral     = data.reduce((acc, c) => acc + c.totalBs, 0);
    const totalGeneralSinIVA = Math.round(totalGeneral * (1 - IVA) * 100) / 100;

    logger.info({ query }, "Reporte compras-proveedor generado");
    return { compras: data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, totalGeneral: Math.round(totalGeneral * 100) / 100, totalGeneralSinIVA };
  },

  async getAnulacionesEntradas(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        const compras = await prisma.compra.findMany({
          where: {
            estado: "ANULADA",
            OR: [
              { fechaOperacion: { gte: startOfMonth, lt: endOfMonth } },
              { fechaOperacion: null, recibidoAt: { gte: startOfMonth, lt: endOfMonth } },
              { fechaOperacion: null, recibidoAt: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
            ],
          },
          include: {
            proveedor: { select: { id: true, nombre: true, razonSocial: true, nit: true } },
            usuarioRegistro: { select: { id: true, nombre: true } },
            usuarioRecibe: { select: { id: true, nombre: true } },
            anulacion: { include: { usuario: { select: { id: true, nombre: true } } } },
            items: {
              include: { producto: { select: { id: true, codigo: true, nombre: true, unidad: true } } },
              orderBy: { id: "asc" as const },
            },
          },
          orderBy: [{ fechaOperacion: "asc" }, { createdAt: "asc" }],
        });

        const data = compras.map((c: any) => {
          const items = c.items.map((item: any) => ({
            productoId:       item.productoId,
            codigo:           item.producto.codigo,
            nombre:           item.producto.nombre,
            unidad:           item.producto.unidad,
            cantidadPedida:   Number(item.cantidadPedida),
            cantidadRecibida: Number(item.cantidadRecibida),
            precioUnit:       Number(item.precioUnit),
            totalBs:          Number(item.cantidadRecibida) * Number(item.precioUnit),
          }));
          const totalBs = items.reduce((acc: number, i: any) => acc + i.totalBs, 0);
          return {
            id:             c.id,
            numeroFactura:  c.numeroFactura ?? null,
            observacion:    c.observacion ?? null,
            fechaOperacion: c.fechaOperacion ?? null,
            createdAt:      c.createdAt,
            recibidoAt:     c.recibidoAt ?? null,
            proveedor:      c.proveedor,
            usuarioRegistro: c.usuarioRegistro,
            usuarioRecibe:  c.usuarioRecibe ?? null,
            anulacion:      c.anulacion
              ? { motivo: c.anulacion.motivo, creadoAt: c.anulacion.createdAt, usuario: c.anulacion.usuario }
              : null,
            items,
            totalBs: Math.round(totalBs * 100) / 100,
          };
        });

        const totalGeneral = data.reduce((acc, c) => acc + c.totalBs, 0);
        return { anio, mes, compras: data, total: data.length, totalGeneral: Math.round(totalGeneral * 100) / 100 };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Anulaciones entradas generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getAnulacionesSalidas(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        const vales = await prisma.vale.findMany({
          where: {
            estado: "ANULADO",
            OR: [
              { fechaOperacion: { gte: startOfMonth, lt: endOfMonth } },
              { fechaOperacion: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
            ],
          },
          include: {
            solicitante:      { select: { id: true, nombre: true } },
            superintendente:  { select: { id: true, nombre: true } },
            almacenero:       { select: { id: true, nombre: true } },
            anulacion:        { include: { usuario: { select: { id: true, nombre: true } } } },
            items: {
              include: { producto: { select: { id: true, codigo: true, nombre: true, unidad: true } } },
            },
          },
          orderBy: [{ fechaOperacion: "asc" }, { createdAt: "asc" }],
        });

        const data = (vales as any[]).map((v) => {
          const items = v.items.map((item: any) => ({
            productoId:        item.productoId,
            codigo:            item.producto.codigo,
            nombre:            item.producto.nombre,
            unidad:            item.producto.unidad,
            cantidadSolicitada: Number(item.cantidadSolicitada),
            cantidadEntregada:  Number(item.cantidadEntregada ?? 0),
          }));
          return {
            id:              v.id,
            numeroVale:      v.numeroVale ?? null,
            observacion:     v.observacion ?? null,
            fechaOperacion:  v.fechaOperacion ?? null,
            createdAt:       v.createdAt,
            solicitante:     v.solicitante,
            superintendente: v.superintendente ?? null,
            almacenero:      v.almacenero ?? null,
            anulacion:       v.anulacion
              ? { motivo: v.anulacion.motivo, creadoAt: v.anulacion.createdAt, usuario: v.anulacion.usuario }
              : null,
            items,
          };
        });

        return { anio, mes, vales: data, total: data.length };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Anulaciones salidas generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getDetalleMateriales(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));
        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        const [movimientos, saldosMes] = await Promise.all([
          prisma.movimiento.findMany({
            where: {
              tipo: "SALIDA",
              referencia: { not: "ANULACION_COMPRA" },
              cuentaId: { not: null },
              OR: [
                { periodoAnio: anio, periodoMes: mes },
                { periodoAnio: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
              ],
            },
            include: {
              cuenta: { include: { centroCosto: true, funcionGasto: true } },
            },
          }),
          prisma.saldoMensual.findMany({
            where: { anio, mes },
            select: { productoId: true, precioUnit: true },
          }),
        ]);

        const precioMap = new Map<number, number>(
          saldosMes.map((s) => [s.productoId, Number(s.precioUnit)]),
        );

        // Group by funcionGasto.codigo (SUB CENTRO) × centroCosto.codigo (SUB CUENTA)
        const lineaMap = new Map<string, { subCuenta: string; subCentro: string; subCentroNombre: string; importeBs: number }>();

        for (const mov of movimientos) {
          if (!mov.cuenta) continue;
          const subCuenta  = mov.cuenta.centroCosto.codigo;
          const subCentro  = mov.cuenta.funcionGasto.codigo;
          const key        = `${subCentro}|${subCuenta}`;
          const precio     = precioMap.get(mov.productoId) ?? Number(mov.precioUnit);

          if (!lineaMap.has(key)) {
            lineaMap.set(key, { subCuenta, subCentro, subCentroNombre: mov.cuenta.funcionGasto.nombre, importeBs: 0 });
          }
          lineaMap.get(key)!.importeBs += Number(mov.cantidad) * precio;
        }

        const lineas = [...lineaMap.values()]
          .map((l) => ({ ...l, importeBs: Math.round(l.importeBs * 100) / 100 }))
          .sort((a, b) => {
            const c = a.subCentro.localeCompare(b.subCentro, undefined, { numeric: true });
            return c !== 0 ? c : a.subCuenta.localeCompare(b.subCuenta, undefined, { numeric: true });
          });

        // Subtotals per SUB CENTRO (across all sub-cuentas)
        const subCentroMap = new Map<string, { subCentro: string; nombre: string; importeBs: number }>();
        for (const l of lineas) {
          if (!subCentroMap.has(l.subCentro)) {
            subCentroMap.set(l.subCentro, { subCentro: l.subCentro, nombre: l.subCentroNombre, importeBs: 0 });
          }
          subCentroMap.get(l.subCentro)!.importeBs += l.importeBs;
        }
        const subtotalesPorSubCentro = [...subCentroMap.values()]
          .map((s) => ({ ...s, importeBs: Math.round(s.importeBs * 100) / 100 }))
          .sort((a, b) => a.subCentro.localeCompare(b.subCentro, undefined, { numeric: true }));

        const totalGeneral = Math.round(lineas.reduce((acc, l) => acc + l.importeBs, 0) * 100) / 100;

        return { anio, mes, esCerrado, lineas, subtotalesPorSubCentro, totalGeneral };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Detalle materiales generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getDiarioAlmacenes(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));
        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        const prevMes  = mes === 1 ? 12 : mes - 1;
        const prevAnio = mes === 1 ? anio - 1 : anio;

        const [saldosPrevMes, saldosMesActual, compraItemsRaw, movimientos] = await Promise.all([
          prisma.saldoMensual.findMany({
            where: { anio: prevAnio, mes: prevMes },
            select: { saldoFinal: true, precioUnit: true },
          }),
          prisma.saldoMensual.findMany({
            where: { anio, mes },
            select: { productoId: true, precioUnit: true, saldoInicial: true },
          }),
          prisma.compraItem.findMany({
            where: {
              cantidadRecibida: { gt: 0 },
              compra: {
                estado: { not: "ANULADA" },
                OR: [
                  { fechaOperacion: { gte: startOfMonth, lt: endOfMonth } },
                  { fechaOperacion: null, recibidoAt: { gte: startOfMonth, lt: endOfMonth } },
                  { fechaOperacion: null, recibidoAt: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
                ],
              },
            },
            select: { cantidadRecibida: true, precioUnit: true },
          }),
          prisma.movimiento.findMany({
            where: {
              tipo: "SALIDA",
              referencia: { not: "ANULACION_COMPRA" },
              cuentaId: { not: null },
              OR: [
                { periodoAnio: anio, periodoMes: mes },
                { periodoAnio: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
              ],
            },
            include: {
              cuenta: { include: { centroCosto: true, funcionGasto: true, sector: true } },
            },
          }),
        ]);

        const precioMap = new Map<number, number>(
          saldosMesActual.map((s) => [s.productoId, Number(s.precioUnit)]),
        );

        // DEBE: saldo inventario anterior (prev month closing value)
        const saldoInventarioAnterior = saldosPrevMes.length > 0
          ? saldosPrevMes.reduce((acc, s) => acc + Number(s.saldoFinal) * Number(s.precioUnit), 0)
          : saldosMesActual.reduce((acc, s) => acc + Number(s.saldoInicial) * Number(s.precioUnit), 0);

        const comprasImporteBs = compraItemsRaw.reduce(
          (acc, item) => acc + Number(item.cantidadRecibida) * Number(item.precioUnit),
          0,
        );

        const totalInventarioDebe = saldoInventarioAnterior + comprasImporteBs;

        // HABER: salidas grouped by Sector (primary) → CentroCosto (secondary) → CuentaContable (lines)
        type SubCuentaEntry = { cuentaId: number; codigoCompleto: string; funcionGastoCodigo: string; funcionGastoNombre: string; totalBs: number };
        type CcEntry        = { centroCostoCodigo: string; centroCostoNombre: string; subCuentas: Map<number, SubCuentaEntry>; totalBs: number };
        type SectorEntry    = { sectorId: number | null; sectorCodigo: string | null; sectorNombre: string | null; centroCostos: Map<number, CcEntry>; totalBs: number };

        // Use -1 as map key for movements with no sector
        const sectorMap = new Map<number, SectorEntry>();

        for (const mov of movimientos) {
          if (!mov.cuenta || !mov.cuentaId) continue;
          const precio    = precioMap.get(mov.productoId) ?? Number(mov.precioUnit);
          const importeBs = Number(mov.cantidad) * precio;
          const sectorKey = mov.cuenta.sectorId ?? -1;

          if (!sectorMap.has(sectorKey)) {
            sectorMap.set(sectorKey, {
              sectorId:     mov.cuenta.sectorId ?? null,
              sectorCodigo: mov.cuenta.sector?.codigo ?? null,
              sectorNombre: mov.cuenta.sector?.nombre ?? null,
              centroCostos: new Map(),
              totalBs:      0,
            });
          }
          const sectorEntry = sectorMap.get(sectorKey)!;
          sectorEntry.totalBs += importeBs;

          const ccId = mov.cuenta.centroCostoId;
          if (!sectorEntry.centroCostos.has(ccId)) {
            sectorEntry.centroCostos.set(ccId, {
              centroCostoCodigo: mov.cuenta.centroCosto.codigo,
              centroCostoNombre: mov.cuenta.centroCosto.nombre,
              subCuentas: new Map(),
              totalBs: 0,
            });
          }
          const ccEntry = sectorEntry.centroCostos.get(ccId)!;
          ccEntry.totalBs += importeBs;

          if (!ccEntry.subCuentas.has(mov.cuentaId)) {
            ccEntry.subCuentas.set(mov.cuentaId, {
              cuentaId:           mov.cuentaId,
              codigoCompleto:     mov.cuenta.codigoCompleto,
              funcionGastoCodigo: mov.cuenta.funcionGasto.codigo,
              funcionGastoNombre: mov.cuenta.funcionGasto.nombre,
              totalBs:            0,
            });
          }
          ccEntry.subCuentas.get(mov.cuentaId)!.totalBs += importeBs;
        }

        const sectoresHaber = [...sectorMap.values()]
          .sort((a, b) => (a.sectorCodigo ?? "").localeCompare(b.sectorCodigo ?? "", undefined, { numeric: true }))
          .map((s) => ({
            sectorId:     s.sectorId,
            sectorCodigo: s.sectorCodigo,
            sectorNombre: s.sectorNombre,
            totalBs:      Math.round(s.totalBs * 100) / 100,
            centroCostos: [...s.centroCostos.values()]
              .sort((a, b) => a.centroCostoCodigo.localeCompare(b.centroCostoCodigo, undefined, { numeric: true }))
              .map((cc) => ({
                centroCostoCodigo: cc.centroCostoCodigo,
                centroCostoNombre: cc.centroCostoNombre,
                totalBs:           Math.round(cc.totalBs * 100) / 100,
                subCuentas:        [...cc.subCuentas.values()]
                  .sort((a, b) => a.funcionGastoCodigo.localeCompare(b.funcionGastoCodigo, undefined, { numeric: true }))
                  .map((sc) => ({ ...sc, totalBs: Math.round(sc.totalBs * 100) / 100 })),
              })),
          }));

        const totalSalidasHaber = Math.round(sectoresHaber.reduce((acc, s) => acc + s.totalBs, 0) * 100) / 100;

        return {
          anio, mes, esCerrado,
          saldoInventarioAnterior: Math.round(saldoInventarioAnterior * 100) / 100,
          comprasImporteBs:        Math.round(comprasImporteBs * 100) / 100,
          totalInventarioDebe:     Math.round(totalInventarioDebe * 100) / 100,
          sectoresHaber,
          totalSalidasHaber,
        };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Diario almacenes generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getCuadroSuministros(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);
    const IVA = 0.13;

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));
        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        const comprasRaw = await prisma.compra.findMany({
          where: {
            estado: { not: "ANULADA" },
            OR: [
              { fechaOperacion: { gte: startOfMonth, lt: endOfMonth } },
              { fechaOperacion: null, recibidoAt: { gte: startOfMonth, lt: endOfMonth } },
              { fechaOperacion: null, recibidoAt: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
            ],
          },
          include: {
            proveedor: { select: { id: true, nombre: true, nit: true, razonSocial: true } },
            items: {
              where: { cantidadRecibida: { gt: 0 } },
              include: { producto: { include: { categoria: { include: { parent: true } } } } },
              orderBy: { id: "asc" as const },
            },
          },
          orderBy: [{ proveedor: { nombre: "asc" } }, { fechaOperacion: "asc" }, { createdAt: "asc" }],
        });

        // Group by proveedor
        const provMap = new Map<number, { proveedor: any; compras: any[]; totalBs: number }>();

        for (const c of comprasRaw) {
          if (!provMap.has(c.proveedorId)) {
            provMap.set(c.proveedorId, { proveedor: c.proveedor, compras: [], totalBs: 0 });
          }
          const provEntry = provMap.get(c.proveedorId)!;

          const items = c.items.map((item: any) => {
            const cat     = item.producto.categoria;
            const grupo   = cat.parent !== null ? cat.parent : cat;
            const cantidad    = Number(item.cantidadRecibida);
            const precioUnit  = Number(item.precioUnit);
            const importeBs   = Math.round(cantidad * precioUnit * 100) / 100;
            const importeSinIVA = Math.round(importeBs * (1 - IVA) * 100) / 100;
            return {
              productoId: item.productoId,
              nombre:     item.producto.nombre,
              unidad:     item.producto.unidad,
              cantidad,
              precioUnit,
              importeBs,
              importeSinIVA,
              grupo: { codigo: grupo.codigo, nombre: grupo.nombre },
            };
          });

          const subtotalBs = Math.round(items.reduce((acc: number, i: any) => acc + i.importeBs, 0) * 100) / 100;

          provEntry.compras.push({
            id: c.id,
            numeroFactura:  c.numeroFactura ?? null,
            fechaOperacion: c.fechaOperacion ?? null,
            items,
            subtotalBs,
          });
          provEntry.totalBs += subtotalBs;
        }

        const proveedores = [...provMap.values()].map((p) => ({
          proveedor: p.proveedor,
          compras:   p.compras,
          totalBs:   Math.round(p.totalBs * 100) / 100,
        }));

        const totalGeneral = Math.round(proveedores.reduce((acc, p) => acc + p.totalBs, 0) * 100) / 100;

        return { anio, mes, esCerrado, proveedores, totalGeneral };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Cuadro suministros generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },
};
