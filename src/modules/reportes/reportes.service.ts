import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import type {
  BinCardQueryDTO,
  StockQueryDTO,
  ValesResumenQueryDTO,
  ComprasResumenQueryDTO,
  PeriodoRangoQueryDTO,
  SalidasDetalleQueryDTO,
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

// Calcula el monto sin IVA (13%) evitando errores de punto flotante en el límite exacto de .5.
// Técnica: primero redondea el impuesto (donde 0.13_fp > 0.13 hace que el límite redondee arriba),
// luego resta al total. Esto da el resultado matemático correcto en todos los casos.
function menos13(total: number): number {
  const iva = Math.round(total * 0.13 * 100) / 100;
  return Math.round((total - iva) * 100) / 100;
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

  async getSaldosIniciales(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));

        const registros = await (prisma.saldoMensual.findMany as any)({
          where: { anio, mes },
          select: {
            productoId: true,
            saldoInicial: true,
            precioUnit: true,
            totalBsInicial: true,
            producto: {
              select: {
                codigo: true,
                nombre: true,
                unidad: true,
                categoria: { select: { nombre: true, codigo: true, parent: { select: { nombre: true, codigo: true } } } },
              },
            },
          },
          orderBy: { producto: { codigo: "asc" } },
        }) as Array<{
          productoId: number;
          saldoInicial: unknown;
          precioUnit: unknown;
          totalBsInicial: unknown;
          producto: {
            codigo: string;
            nombre: string;
            unidad: string;
            categoria: { nombre: string; codigo: string; parent: { nombre: string; codigo: string } | null };
          };
        }>;

        const grupoMap = new Map<string, {
          grupoCodigo: string;
          grupoNombre: string;
          productos: Array<{
            codigo: string;
            nombre: string;
            unidad: string;
            saldoInicial: number;
            precioUnit: number;
            totalBsInicial: number;
            fuente: "corregido" | "calculado";
          }>;
          totalBsInicial: number;
        }>();

        for (const r of registros) {
          const cat      = r.producto.categoria;
          const grupo    = cat.parent ?? cat;
          const key      = grupo.codigo;

          if (!grupoMap.has(key)) {
            grupoMap.set(key, { grupoCodigo: grupo.codigo, grupoNombre: grupo.nombre, productos: [], totalBsInicial: 0 });
          }

          const saldoInicial = Number(r.saldoInicial);
          const precioUnit   = Number(r.precioUnit);
          const fuente       = r.totalBsInicial !== null && r.totalBsInicial !== undefined
            ? "corregido" as const
            : "calculado" as const;
          const totalBsInicial = fuente === "corregido"
            ? Number(r.totalBsInicial)
            : Math.round(saldoInicial * precioUnit * 100) / 100;

          const entry = grupoMap.get(key)!;
          entry.productos.push({ codigo: r.producto.codigo, nombre: r.producto.nombre, unidad: r.producto.unidad, saldoInicial, precioUnit, totalBsInicial, fuente });
          entry.totalBsInicial += totalBsInicial;
        }

        const grupos = [...grupoMap.values()]
          .sort((a, b) => a.grupoCodigo.localeCompare(b.grupoCodigo))
          .map((g) => ({ ...g, totalBsInicial: Math.round(g.totalBsInicial * 100) / 100 }));

        const totalGeneral = Math.round(grupos.reduce((acc, g) => acc + g.totalBsInicial, 0) * 100) / 100;
        const totalCorregidos = registros.filter((r) => r.totalBsInicial !== null && r.totalBsInicial !== undefined).length;
        const totalCalculados = registros.length - totalCorregidos;

        return { anio, mes, esCerrado, grupos, totalGeneral, meta: { totalProductos: registros.length, corregidos: totalCorregidos, calculados: totalCalculados } };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Saldos iniciales por rango generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
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

        const [registros, compraItemsRaw, salidasMovsRaw, anulacionValeMovs] = await Promise.all([
          (prisma.saldoMensual.findMany as any)({
            where: { anio, mes },
            select: {
              productoId: true,
              saldoInicial: true,
              ingresoQty: true,
              salidaQty: true,
              precioUnit: true,
              totalBsInicial: true,
              producto: { select: { categoria: { select: { id: true, codigo: true, nombre: true, parent: { select: { id: true, codigo: true, nombre: true } } } } } },
            },
          }) as any[],
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
            select: { productoId: true, cantidad: true, precioUnit: true, referencia: true, referenciaId: true },
          }),
          prisma.movimiento.findMany({
            where: { referencia: "ANULACION_VALE", ...movFilter },
            select: { referenciaId: true },
          }),
        ]);

        const valesAnuladosIdsBalance = new Set(
          anulacionValeMovs.map(m => m.referenciaId).filter((id): id is string => id !== null),
        );
        const salidasMovs = salidasMovsRaw.filter(
          m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIdsBalance.has(m.referenciaId)),
        );

        const ingresoMap = new Map<number, { qty: number; bs: number }>();
        for (const item of compraItemsRaw) {
          const e = ingresoMap.get(item.productoId) ?? { qty: 0, bs: 0 };
          e.qty += Number(item.cantidadRecibida);
          e.bs  += Number(item.cantidadRecibida) * Number(item.precioUnit);
          ingresoMap.set(item.productoId, e);
        }

        // Precio del SaldoMensual de ese mes. Fallback al promedio de compras cuando precioUnit=0
        // (ocurre en productos nuevos comprados y consumidos en el mismo mes con cierre incompleto).
        const precioMesMap = new Map<number, number>(
          registros.map((r: any) => {
            const precio = Number(r.precioUnit);
            if (precio > 0) return [r.productoId as number, precio];
            const ing = ingresoMap.get(r.productoId as number);
            return [r.productoId as number, ing && ing.qty > 0 ? ing.bs / ing.qty : 0];
          }),
        );

        const salidaMap = new Map<number, { qty: number; bs: number }>();
        for (const mov of salidasMovs) {
          const e = salidaMap.get(mov.productoId) ?? { qty: 0, bs: 0 };
          const precioMes = precioMesMap.get(mov.productoId) ?? Number(mov.precioUnit);
          e.qty += Number(mov.cantidad);
          e.bs  += Number(mov.cantidad) * precioMes;
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
          // Redondear por producto antes de acumular (igual que saldos-iniciales)
          // para evitar acumulación de errores de punto flotante en el total del grupo.
          const saldoInicialBs  = r.totalBsInicial !== null && r.totalBsInicial !== undefined
            ? Math.round(Number(r.totalBsInicial) * 100) / 100
            : Math.round(saldoInicial * precioUnit * 100) / 100;
          const ingresosBs      = Math.round(ingresos.bs * 100) / 100;
          const salidasBs       = Math.round(salidas.bs * 100) / 100;

          const entry = grupoMap.get(grupoId)!;
          entry.saldoInicial      += saldoInicialBs;
          entry.ingresoMateriales += ingresosBs;
          entry.salidaMateriales  += salidasBs;
          entry.saldoFinal        += saldoInicialBs + ingresosBs - salidasBs;
        }

        // Entradas y salidas se muestran sin IVA (13%) para el cuadro contable.
        // saldoFinal se recalcula con los valores ya sin IVA para que la ecuación cierre en pantalla.
        const grupos = [...grupoMap.values()]
          .sort((a, b) => a.grupoCodigo.localeCompare(b.grupoCodigo))
          .map(g => {
            const ingresoMateriales = menos13(g.ingresoMateriales);
            const salidaMateriales  = menos13(g.salidaMateriales);
            return {
              ...g,
              ingresoMateriales,
              salidaMateriales,
              saldoFinal: Math.round((g.saldoInicial + ingresoMateriales - salidaMateriales) * 100) / 100,
            };
          });

        const totales = grupos.reduce(
          (acc, g) => ({
            saldoInicial:       acc.saldoInicial       + g.saldoInicial,
            ingresoMateriales:  acc.ingresoMateriales  + g.ingresoMateriales,
            salidaMateriales:   acc.salidaMateriales   + g.salidaMateriales,
            saldoFinal:         acc.saldoFinal         + g.saldoFinal,
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

        const [registros, compraItemsRaw, salidasMovsRaw, anulacionValeMovsInv] = await Promise.all([
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
            select: { productoId: true, cantidadRecibida: true, precioUnit: true },
          }),
          prisma.movimiento.findMany({
            where: { tipo: "SALIDA", referencia: { not: "ANULACION_COMPRA" }, ...movFilter },
            select: { productoId: true, cantidad: true, referencia: true, referenciaId: true },
          }),
          prisma.movimiento.findMany({
            where: { referencia: "ANULACION_VALE", ...movFilter },
            select: { referenciaId: true },
          }),
        ]);

        const valesAnuladosIdsInv = new Set(
          anulacionValeMovsInv.map(m => m.referenciaId).filter((id): id is string => id !== null),
        );
        const salidasMovs = salidasMovsRaw.filter(
          m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIdsInv.has(m.referenciaId)),
        );

        const ingresoMap = new Map<number, number>();
        const compraAccInv = new Map<number, { totalBs: number; qty: number }>();
        for (const item of compraItemsRaw) {
          ingresoMap.set(item.productoId, (ingresoMap.get(item.productoId) ?? 0) + Number(item.cantidadRecibida));
          const e = compraAccInv.get(item.productoId) ?? { totalBs: 0, qty: 0 };
          e.totalBs += Number(item.cantidadRecibida) * Number(item.precioUnit);
          e.qty      += Number(item.cantidadRecibida);
          compraAccInv.set(item.productoId, e);
        }
        const compraAvgInv = new Map<number, number>(
          [...compraAccInv.entries()].map(([pid, { totalBs, qty }]) => [pid, qty > 0 ? totalBs / qty : 0]),
        );

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
          const _precioSaldo = Number(r.precioUnit);
          const precioUnit   = _precioSaldo > 0 ? _precioSaldo : (compraAvgInv.get(r.productoId) ?? 0);
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
            totalBsEntradaMenos13:  menos13(g.totalBsEntrada),
            subGrupos: [...g.subGrupos.values()]
              .sort((a, b) => a.codigo.localeCompare(b.codigo))
              .map((sg) => ({
                ...sg,
                productos: sg.productos.sort((a, b) => a.codigo.localeCompare(b.codigo)),
              })),
          }));

        const totalGeneral        = Math.round(grupos.reduce((acc, g) => acc + g.totalBsEntrada, 0) * 100) / 100;
        const totalGeneralMenos13 = menos13(totalGeneral);

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

        const salidaMovFilter = {
          OR: [
            { periodoAnio: anio, periodoMes: mes },
            { periodoAnio: null as null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
          ],
        };

        const [movimentosRaw, saldosMes, anulacionValeMovsSalidas, compraItemsSalidas] = await Promise.all([
          prisma.movimiento.findMany({
            where: {
              tipo: "SALIDA",
              referencia: { not: "ANULACION_COMPRA" },
              ...salidaMovFilter,
            },
            include: {
              producto: {
                include: { categoria: { include: { parent: true } } },
              },
            },
          }),
          prisma.saldoMensual.findMany({
            where: { anio, mes },
            select: { productoId: true, precioUnit: true },
          }),
          prisma.movimiento.findMany({
            where: { referencia: "ANULACION_VALE", ...salidaMovFilter },
            select: { referenciaId: true },
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
        ]);

        const valesAnuladosIdsSalidas = new Set(
          anulacionValeMovsSalidas.map(m => m.referenciaId).filter((id): id is string => id !== null),
        );
        const movimientos = movimentosRaw.filter(
          m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIdsSalidas.has(m.referenciaId)),
        );

        const compraAvgMapSalidas = new Map<number, number>();
        for (const item of compraItemsSalidas) {
          const e = compraAvgMapSalidas.get(item.productoId) ?? 0;
          compraAvgMapSalidas.set(item.productoId, e + Number(item.cantidadRecibida) * Number(item.precioUnit));
        }
        const compraQtyMapSalidas = new Map<number, number>();
        for (const item of compraItemsSalidas) {
          compraQtyMapSalidas.set(item.productoId, (compraQtyMapSalidas.get(item.productoId) ?? 0) + Number(item.cantidadRecibida));
        }

        const precioHistoricoMap = new Map<number, number>(
          saldosMes.map((s) => {
            const precio = Number(s.precioUnit);
            if (precio > 0) return [s.productoId, precio];
            const totalBs = compraAvgMapSalidas.get(s.productoId) ?? 0;
            const totalQty = compraQtyMapSalidas.get(s.productoId) ?? 0;
            return [s.productoId, totalQty > 0 ? totalBs / totalQty : 0];
          }),
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
            totalBsSalidaMenos13: menos13(g.totalBsSalida),
            subGrupos: [...g.subGrupos.values()]
              .sort((a, b) => a.codigo.localeCompare(b.codigo))
              .map((sg) => ({
                ...sg,
                productos: sg.productos.sort((a, b) => a.codigo.localeCompare(b.codigo)),
              })),
          }));

        const totalGeneral        = Math.round(grupos.reduce((acc, g) => acc + g.totalBsSalida, 0) * 100) / 100;
        const totalGeneralMenos13 = menos13(totalGeneral);

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

        const detalleMesFilter = {
          OR: [
            { periodoAnio: anio, periodoMes: mes },
            { periodoAnio: null as null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
          ],
        };

        const [movimentosRaw, saldosMes, anulacionValeMovsDetalle, compraItemsDetalle] = await Promise.all([
          prisma.movimiento.findMany({
            where: {
              tipo: "SALIDA",
              referencia: { not: "ANULACION_COMPRA" },
              cuentaId: { not: null },
              ...detalleMesFilter,
            },
            include: {
              cuenta: { include: { centroCosto: true, funcionGasto: true, sector: true } },
              producto: { select: { nombre: true, unidad: true } },
            },
          }),
          prisma.saldoMensual.findMany({
            where: { anio, mes },
            select: { productoId: true, precioUnit: true },
          }),
          prisma.movimiento.findMany({
            where: { referencia: "ANULACION_VALE", ...detalleMesFilter },
            select: { referenciaId: true },
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
        ]);

        const valesAnuladosIdsDetalle = new Set(
          anulacionValeMovsDetalle.map(m => m.referenciaId).filter((id): id is string => id !== null),
        );
        const movimientos = movimentosRaw.filter(
          m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIdsDetalle.has(m.referenciaId)),
        );

        const precioMap = new Map<number, number>(
          saldosMes.map((s) => [s.productoId, Number(s.precioUnit)]),
        );

        // Compra-average fallback for products with precioUnit=0 in SaldoMensual
        const compraAccDetalle = new Map<number, { totalBs: number; qty: number }>();
        for (const item of compraItemsDetalle) {
          const e = compraAccDetalle.get(item.productoId) ?? { totalBs: 0, qty: 0 };
          e.totalBs += Number(item.cantidadRecibida) * Number(item.precioUnit);
          e.qty      += Number(item.cantidadRecibida);
          compraAccDetalle.set(item.productoId, e);
        }
        const compraAvgDetalle = new Map<number, number>(
          [...compraAccDetalle.entries()].map(([pid, { totalBs, qty }]) => [pid, qty > 0 ? totalBs / qty : 0]),
        );

        // Group by funcionGasto.codigo (SUB CENTRO) × centroCosto.codigo (SUB CUENTA)
        const lineaMap = new Map<string, { subCuenta: string; subCentro: string; subCentroNombre: string; importeBs: number }>();

        for (const mov of movimientos) {
          if (!mov.cuenta) continue;
          const subCuenta  = mov.cuenta.centroCosto.codigo;
          const subCentro  = mov.cuenta.funcionGasto.codigo;
          const key        = `${subCentro}|${subCuenta}`;
          const _psDetalle1 = precioMap.get(mov.productoId);
          const precio     = (_psDetalle1 != null && _psDetalle1 > 0) ? _psDetalle1 : (compraAvgDetalle.get(mov.productoId) ?? Number(mov.precioUnit));

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

        // ── Agrupación por CuentaContable (codigoCompleto) ──────────────────
        // Cada CuentaContable es una "sección" del reporte de detalle de materiales.
        // Si tiene sector (vehículo) → formato transporte con filas individuales.
        // Si no tiene sector → formato agregado por subCuenta × subCentro.
        type DetalleEntry = { productoNombre: string; unidad: string; cantidad: number; importeBs: number; vehiculo: string | null };
        type LinDetalle = { subCuenta: string; subCentro: string; subCentroNombre: string; importeBs: number };
        type CuentaDetalleEntry = {
          codigoCompleto: string;
          centroCostoCodigo: string;
          centroCostoNombre: string;
          funcionGastoCodigo: string;
          funcionGastoNombre: string;
          vehiculo: string | null;
          esTransporte: boolean;
          detalles: DetalleEntry[];
          lineas: Map<string, LinDetalle>;
          totalBs: number;
          totalCantidad: number;
        };
        const cuentaDetalleMap = new Map<string, CuentaDetalleEntry>();

        for (const mov of movimientos) {
          if (!mov.cuenta) continue;
          const _psDetalle2 = precioMap.get(mov.productoId);
          const precio = (_psDetalle2 != null && _psDetalle2 > 0) ? _psDetalle2 : (compraAvgDetalle.get(mov.productoId) ?? Number(mov.precioUnit));
          const importeBs = Number(mov.cantidad) * precio;
          const cc = mov.cuenta.codigoCompleto;
          const esTransporte = mov.cuenta.sectorId !== null;

          if (!cuentaDetalleMap.has(cc)) {
            cuentaDetalleMap.set(cc, {
              codigoCompleto: cc,
              centroCostoCodigo: mov.cuenta.centroCosto.codigo,
              centroCostoNombre: mov.cuenta.centroCosto.nombre,
              funcionGastoCodigo: mov.cuenta.funcionGasto.codigo,
              funcionGastoNombre: mov.cuenta.funcionGasto.nombre,
              vehiculo: mov.cuenta.sector?.nombre ?? null,
              esTransporte,
              detalles: [],
              lineas: new Map(),
              totalBs: 0,
              totalCantidad: 0,
            });
          }
          const ccEntry = cuentaDetalleMap.get(cc)!;
          ccEntry.totalBs += importeBs;

          if (esTransporte) {
            ccEntry.detalles.push({
              productoNombre: (mov as any).producto?.nombre ?? "",
              unidad: (mov as any).producto?.unidad ?? "",
              cantidad: Number(mov.cantidad),
              importeBs: Math.round(importeBs * 100) / 100,
              vehiculo: mov.cuenta.sector?.nombre ?? null,
            });
            ccEntry.totalCantidad += Number(mov.cantidad);
          } else {
            const subCuenta = mov.cuenta.centroCosto.codigo;
            const subCentro = mov.cuenta.funcionGasto.codigo;
            const key = `${subCentro}|${subCuenta}`;
            if (!ccEntry.lineas.has(key)) {
              ccEntry.lineas.set(key, { subCuenta, subCentro, subCentroNombre: mov.cuenta.funcionGasto.nombre, importeBs: 0 });
            }
            ccEntry.lineas.get(key)!.importeBs += importeBs;
          }
        }

        const porCuenta = [...cuentaDetalleMap.values()]
          .sort((a, b) => a.codigoCompleto.localeCompare(b.codigoCompleto))
          .map((entry) => {
            const base = {
              codigoCompleto:    entry.codigoCompleto,
              centroCostoCodigo: entry.centroCostoCodigo,
              centroCostoNombre: entry.centroCostoNombre,
              funcionGastoCodigo: entry.funcionGastoCodigo,
              funcionGastoNombre: entry.funcionGastoNombre,
              vehiculo:          entry.vehiculo,
              esTransporte:      entry.esTransporte,
              totalBs:           Math.round(entry.totalBs * 100) / 100,
            };
            if (entry.esTransporte) {
              return { ...base, totalCantidad: entry.totalCantidad, detalles: entry.detalles };
            }
            const lins = [...entry.lineas.values()]
              .map((l) => ({ ...l, importeBs: Math.round(l.importeBs * 100) / 100 }))
              .sort((a, b) => {
                const c = a.subCentro.localeCompare(b.subCentro, undefined, { numeric: true });
                return c !== 0 ? c : a.subCuenta.localeCompare(b.subCuenta, undefined, { numeric: true });
              });
            return { ...base, lineas: lins };
          });
        // ────────────────────────────────────────────────────────────────────

        return { anio, mes, esCerrado, lineas, subtotalesPorSubCentro, totalGeneral, porCuenta };
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

        const [saldosMesActual, compraItemsRaw, movimentosRaw, anulacionValeMovsDiario] = await Promise.all([
          (prisma.saldoMensual.findMany as any)({
            where: { anio, mes },
            select: { productoId: true, precioUnit: true, saldoInicial: true, totalBsInicial: true },
          }) as Promise<{ productoId: number; precioUnit: unknown; saldoInicial: unknown; totalBsInicial: unknown }[]>,
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
          prisma.movimiento.findMany({
            where: {
              referencia: "ANULACION_VALE",
              OR: [
                { periodoAnio: anio, periodoMes: mes },
                { periodoAnio: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
              ],
            },
            select: { referenciaId: true },
          }),
        ]);

        const valesAnuladosIdsDiario = new Set(
          anulacionValeMovsDiario.map(m => m.referenciaId).filter((id): id is string => id !== null),
        );
        const movimientos = movimentosRaw.filter(
          m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIdsDiario.has(m.referenciaId)),
        );

        const precioMap = new Map<number, number>(
          saldosMesActual.map((s) => [s.productoId, Number(s.precioUnit)]),
        );

        // Compra-average fallback for products with precioUnit=0 in SaldoMensual
        const compraAccDiario = new Map<number, { totalBs: number; qty: number }>();
        for (const item of compraItemsRaw) {
          const e = compraAccDiario.get(item.productoId) ?? { totalBs: 0, qty: 0 };
          e.totalBs += Number(item.cantidadRecibida) * Number(item.precioUnit);
          e.qty      += Number(item.cantidadRecibida);
          compraAccDiario.set(item.productoId, e);
        }
        const compraAvgDiario = new Map<number, number>(
          [...compraAccDiario.entries()].map(([pid, { totalBs, qty }]) => [pid, qty > 0 ? totalBs / qty : 0]),
        );

        // DEBE: saldo inventario al inicio del mes actual
        // Usa totalBsInicial si está fijado; si no, saldoInicial × precioUnit del mes (con fallback a precio de compra)
        const saldoInventarioAnterior = saldosMesActual.reduce((acc, s) => {
          if (s.totalBsInicial !== null && s.totalBsInicial !== undefined) {
            return acc + Number(s.totalBsInicial);
          }
          const _ps  = Number(s.precioUnit);
          const precio = _ps > 0 ? _ps : (compraAvgDiario.get(s.productoId) ?? 0);
          return acc + Number(s.saldoInicial) * precio;
        }, 0);

        const comprasImporteBs = compraItemsRaw.reduce(
          (acc, item) => acc + Number(item.cantidadRecibida) * Number(item.precioUnit),
          0,
        );

        const totalInventarioDebe = saldoInventarioAnterior + menos13(comprasImporteBs);

        // HABER: salidas grouped by Sector (primary) → CentroCosto (secondary) → CuentaContable (lines)
        type SubCuentaEntry = { cuentaId: number; codigoCompleto: string; funcionGastoCodigo: string; funcionGastoNombre: string; totalBs: number };
        type CcEntry        = { centroCostoCodigo: string; centroCostoNombre: string; subCuentas: Map<number, SubCuentaEntry>; totalBs: number };
        type SectorEntry    = { sectorId: number | null; sectorCodigo: string | null; sectorNombre: string | null; centroCostos: Map<number, CcEntry>; totalBs: number };

        // Use -1 as map key for movements with no sector
        const sectorMap = new Map<number, SectorEntry>();

        for (const mov of movimientos) {
          if (!mov.cuenta || !mov.cuentaId) continue;
          const _psDiario1 = precioMap.get(mov.productoId);
          const precio    = (_psDiario1 != null && _psDiario1 > 0) ? _psDiario1 : (compraAvgDiario.get(mov.productoId) ?? Number(mov.precioUnit));
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

        // ── Agrupación por CuentaContable.codigoCompleto ──────────────────
        // Cada codigoCompleto = una línea de HABER en el diario.
        // - No-transporte: sub-líneas por funcionGasto, con todos los centroCosto involucrados.
        //   El frontend usa subCentro como código de línea (imagen 1) o
        //   subCuentas.sort().join("-") + "-" + subCentro como "No DE CUENTA" (imagen 2).
        // - Transporte: solo total (las imágenes no muestran detalle de vehículos aquí).
        type LinHaberEntry = { subCentro: string; nombre: string; importeBs: number; subCuentas: string[] };
        type CcHaberEntry = {
          codigoCompleto:    string;
          centroCostoCodigo: string;
          centroCostoNombre: string;
          sectorNombre:      string | null;
          esTransporte:      boolean;
          lineas:            Map<string, LinHaberEntry>;
          totalBs:           number;
          totalCantidad:     number;
        };
        const ccHaberMap = new Map<string, CcHaberEntry>();

        for (const mov of movimientos) {
          if (!mov.cuenta) continue;
          const _psDiario2 = precioMap.get(mov.productoId);
          const precio    = (_psDiario2 != null && _psDiario2 > 0) ? _psDiario2 : (compraAvgDiario.get(mov.productoId) ?? Number(mov.precioUnit));
          const importeBs = Number(mov.cantidad) * precio;
          const cc        = mov.cuenta.codigoCompleto;
          const esTransporte = mov.cuenta.sectorId !== null;

          if (!ccHaberMap.has(cc)) {
            ccHaberMap.set(cc, {
              codigoCompleto:    cc,
              centroCostoCodigo: mov.cuenta.centroCosto.codigo,
              centroCostoNombre: mov.cuenta.centroCosto.nombre,
              sectorNombre:      mov.cuenta.sector?.nombre ?? null,
              esTransporte,
              lineas:         new Map(),
              totalBs:        0,
              totalCantidad:  0,
            });
          }
          const ccEntry = ccHaberMap.get(cc)!;
          ccEntry.totalBs += importeBs;

          if (esTransporte) {
            ccEntry.totalCantidad += Number(mov.cantidad);
          } else {
            const subCuenta = mov.cuenta.centroCosto.codigo;
            const subCentro = mov.cuenta.funcionGasto.codigo;
            if (!ccEntry.lineas.has(subCentro)) {
              ccEntry.lineas.set(subCentro, { subCentro, nombre: mov.cuenta.funcionGasto.nombre, importeBs: 0, subCuentas: [] });
            }
            const lin = ccEntry.lineas.get(subCentro)!;
            lin.importeBs += importeBs;
            if (!lin.subCuentas.includes(subCuenta)) lin.subCuentas.push(subCuenta);
          }
        }

        const cuentasHaber = [...ccHaberMap.values()]
          .sort((a, b) => a.codigoCompleto.localeCompare(b.codigoCompleto))
          .map((entry) => {
            const base = {
              codigoCompleto:    entry.codigoCompleto,
              centroCostoCodigo: entry.centroCostoCodigo,
              centroCostoNombre: entry.centroCostoNombre,
              sectorNombre:      entry.sectorNombre,
              esTransporte:      entry.esTransporte,
              totalBs:           Math.round(entry.totalBs * 100) / 100,
            };
            if (entry.esTransporte) {
              return { ...base, totalCantidad: entry.totalCantidad };
            }
            return {
              ...base,
              lineas: [...entry.lineas.values()]
                .map((l) => ({
                  ...l,
                  importeBs:  Math.round(l.importeBs * 100) / 100,
                  subCuentas: [...l.subCuentas].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
                }))
                .sort((a, b) => a.subCentro.localeCompare(b.subCentro, undefined, { numeric: true })),
            };
          });
        // ────────────────────────────────────────────────────────────────────

        const comprasImporteBsRedondeado = Math.round(comprasImporteBs * 100) / 100;

        return {
          anio, mes, esCerrado,
          saldoInventarioAnterior: Math.round(saldoInventarioAnterior * 100) / 100,
          comprasImporteBs:        comprasImporteBsRedondeado,
          comprasSinIva:           menos13(comprasImporteBsRedondeado),
          totalInventarioDebe:     Math.round(totalInventarioDebe * 100) / 100,
          sectoresHaber,
          totalSalidasHaber,
          cuentasHaber,
        };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Diario almacenes generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getSalidasDetalle(query: SalidasDetalleQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin, cuentaId, funcionGastoCodigo, sectorCodigo, centroCostoCodigo, sinCuenta } = query;

    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);
    const periodoOR = rangoMeses.flatMap(({ anio, mes }) => {
      const s = new Date(Date.UTC(anio, mes - 1, 1));
      const e = new Date(Date.UTC(anio, mes, 1));
      return [
        { periodoAnio: anio, periodoMes: mes },
        { periodoAnio: null as null, createdAt: { gte: s, lt: e } },
      ];
    });

    const [movimentosRaw, anulaciones] = await Promise.all([
      prisma.movimiento.findMany({
        where: (() => {
          const w: any = {
            tipo: "SALIDA",
            referencia: { not: "ANULACION_COMPRA" },
            OR: periodoOR,
          };
          if (sinCuenta) {
            w.cuentaId = null;
          } else {
            if (cuentaId) w.cuentaId = cuentaId;
            const cf: any = {};
            if (centroCostoCodigo) cf.centroCosto = { codigo: centroCostoCodigo };
            if (funcionGastoCodigo) cf.funcionGasto = { codigo: funcionGastoCodigo };
            if (sectorCodigo)       cf.sector       = { codigo: sectorCodigo };
            if (Object.keys(cf).length > 0) w.cuenta = cf;
          }
          return w;
        })(),
        include: {
          cuenta: { include: { centroCosto: true, funcionGasto: true, sector: true } },
          producto: { select: { nombre: true, unidad: true, codigo: true } },
          usuarioEntrega: { select: { nombre: true } },
        },
        orderBy: [{ periodoAnio: "asc" }, { periodoMes: "asc" }, { createdAt: "asc" }],
      }),
      prisma.movimiento.findMany({
        where: { referencia: "ANULACION_VALE", OR: periodoOR },
        select: { referenciaId: true },
      }),
    ]);

    const valesAnuladosIds = new Set(
      anulaciones.map(m => m.referenciaId).filter((id): id is string => id !== null),
    );

    const movimientos = movimentosRaw.filter(
      m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIds.has(m.referenciaId)),
    );

    const items = movimientos.map(m => ({
      id:             m.id,
      fecha:          m.createdAt,
      periodoAnio:    m.periodoAnio,
      periodoMes:     m.periodoMes,
      referencia:     m.referencia ?? null,
      referenciaId:   m.referenciaId ?? null,
      productoId:     m.productoId,
      productoCodigo: m.producto.codigo,
      productoNombre: m.producto.nombre,
      productoUnidad: m.producto.unidad,
      cantidad:       Number(m.cantidad),
      precioUnit:     Number(m.precioUnit),
      salidaBs:       Number(m.salidaBs),
      cuenta: m.cuenta ? {
        id:                 m.cuenta.id,
        codigoCompleto:     m.cuenta.codigoCompleto,
        centroCostoCodigo:  m.cuenta.centroCosto.codigo,
        centroCostoNombre:  m.cuenta.centroCosto.nombre,
        funcionGastoCodigo: m.cuenta.funcionGasto.codigo,
        funcionGastoNombre: m.cuenta.funcionGasto.nombre,
        sectorCodigo:       m.cuenta.sector?.codigo ?? null,
        sectorNombre:       m.cuenta.sector?.nombre ?? null,
      } : null,
      usuarioEntrega: m.usuarioEntrega?.nombre ?? null,
    }));

    const totalBs              = Math.round(items.reduce((acc, m) => acc + m.salidaBs, 0) * 100) / 100;
    const movimientosSinCuenta = items.filter(m => m.cuenta === null).length;

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Salidas detalle generado");
    return {
      anioInicio, mesInicio, anioFin, mesFin,
      filtros: {
        cuentaId:           cuentaId           ?? null,
        funcionGastoCodigo: funcionGastoCodigo ?? null,
        sectorCodigo:       sectorCodigo       ?? null,
        centroCostoCodigo:  centroCostoCodigo  ?? null,
        sinCuenta:          sinCuenta          ?? false,
      },
      totalMovimientos:   items.length,
      movimientosSinCuenta,
      totalBs,
      movimientos:        items,
    };
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
