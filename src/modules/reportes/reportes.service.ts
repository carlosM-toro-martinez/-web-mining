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

// Calcula el monto sin IVA (13%): total × 0.87, redondea al centavo.
// Usa multiplicación directa para coincidir con precioUnitProm (que también se guarda como precioUnit × 0.87).
function menos13(total: number): number {
  return Math.round(total * 0.87 * 100) / 100;
}

// Gasolina Nov-Dic 2025: el IVA se aplica solo sobre el 70% de la base.
// IVA = total × 0.70 × 0.13  →  sin IVA = total − IVA = total × (1 − 0.091)
const CODIGO_GASOLINA = "01-01-0002";
// Versión sin redondear: para acumular ingresos con precisión completa antes del redondeo de grupo.
// tieneIva=false → factor 1 (sin descuento); gasolina especial Nov-Dic 2025 → IVA solo sobre 70%.
function sinIvaIngresoRaw(total: number, esGasEspecial: boolean, tieneIva = true): number {
  if (!tieneIva) return total;
  return esGasEspecial ? total - total * 0.70 * 0.13 : total * 0.87;
}
// Precio unitario sin IVA con todos los decimales — reutilizable para cuadro-suministros, entradas-almacen, inventario-almacen.
function precioUnitSinIvaRaw(precio: number, esGasEspecial: boolean, tieneIva = true): number {
  return sinIvaIngresoRaw(precio, esGasEspecial, tieneIva);
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
            precioUnitProm: true,
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
          precioUnitProm: unknown;
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
          // Mismo orden que balance-mensual: precioUnitProm → precioUnit
          const prom     = Number((r as any).precioUnitProm ?? 0);
          const precioUnit = prom > 0 ? prom : Number(r.precioUnit ?? 0);
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
    const gasolinaId = await prisma.producto.findFirst({ where: { codigo: CODIGO_GASOLINA }, select: { id: true } }).then(p => p?.id ?? -1);

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
            orderBy: { producto: { codigo: "asc" } },
            select: {
              productoId: true,
              saldoInicial: true,
              ingresoQty: true,
              salidaQty: true,
              precioUnit: true,
              precioUnitProm: true,
              totalBsInicial: true,
              producto: { select: { categoria: { select: { id: true, codigo: true, nombre: true, parent: { select: { id: true, codigo: true, nombre: true } } } } } },
            },
          }) as any[],
          // Fuente de ingresos: misma query que entradas-almacen (CompraItems reales)
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
            select: { productoId: true, cantidadRecibida: true, precioUnit: true, compra: { select: { tieneIva: true } } },
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

        const valesAnuladosIdsBalance = new Set(
          anulacionValeMovs.map(m => m.referenciaId).filter((id): id is string => id !== null),
        );
        const salidasMovs = salidasMovsRaw.filter(
          m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIdsBalance.has(m.referenciaId)),
        );

        // Gasolina especial Nov-Dic 2025: IVA solo sobre 70% de la base
        const esEspecialMes = anio === 2025 && (mes === 11 || mes === 12);
        const gasEsp = (pid: number) => esEspecialMes && pid === gasolinaId;

        // Acumular qty, bs (con IVA) y sinIvaRaw por producto — tieneIva por item
        const compraMap = new Map<number, { qty: number; bs: number; sinIvaRaw: number }>();
        for (const item of compraItemsRaw) {
          const e = compraMap.get(item.productoId) ?? { qty: 0, bs: 0, sinIvaRaw: 0 };
          const qty    = Number(item.cantidadRecibida);
          const bsItem = qty * Number(item.precioUnit);
          e.qty       += qty;
          e.bs        += bsItem;
          e.sinIvaRaw += sinIvaIngresoRaw(bsItem, gasEsp(item.productoId), item.compra.tieneIva);
          compraMap.set(item.productoId, e);
        }

        // Precio unificado por producto (mismo criterio que salidas-almacen y diario-almacenes):
        // 1. SaldoMensual.precioUnitProm  (ya ex-IVA, fuente principal)
        // 2. SaldoMensual.precioUnit      (ex-IVA, segundo)
        // 3. menos13(compraAvg)           (precio factura convertido a ex-IVA como último recurso)
        const precioFinalMap = new Map<number, number>();
        for (const r of registros) {
          const prom  = Number(r.precioUnitProm ?? 0);
          const unit  = Number(r.precioUnit ?? 0);
          const compra = compraMap.get(r.productoId);
          const compraFallback = compra && compra.qty > 0 ? menos13(compra.bs / compra.qty) : 0;
          precioFinalMap.set(r.productoId, prom > 0 ? prom : unit > 0 ? unit : compraFallback);
        }

        // Salidas: acumular Bs por movimiento sin redondear (igual que diario-almacenes)
        const salidaBsMap = new Map<number, number>();
        for (const mov of salidasMovs) {
          const precio = precioFinalMap.get(mov.productoId) ?? 0;
          salidaBsMap.set(mov.productoId, (salidaBsMap.get(mov.productoId) ?? 0) + Number(mov.cantidad) * precio);
        }

        const grupoMap = new Map<
          number,
          {
            grupoCodigo: string;
            grupoNombre: string;
            saldoInicial: number;
            ingresosExIvaRaw: number;  // sin-IVA acumulado por producto (sinIvaIngreso ya aplicado)
            salidasBsRaw: number;
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
              ingresosExIvaRaw: 0,
              salidasBsRaw: 0,
            });
          }

          const compra    = compraMap.get(r.productoId);
          const precio    = precioFinalMap.get(r.productoId) ?? 0;
          const saldoInicial = Number(r.saldoInicial);

          const saldoInicialBs = r.totalBsInicial !== null && r.totalBsInicial !== undefined
            ? Math.round(Number(r.totalBsInicial) * 100) / 100
            : Math.round(saldoInicial * precio * 100) / 100;

          const exIva    = compra && compra.qty > 0 ? compra.sinIvaRaw : 0;  // pre-computado por item con tieneIva

          const salidasBs = salidaBsMap.has(r.productoId)
            ? salidaBsMap.get(r.productoId)!
            : Number(r.salidaQty) * precio;

          const entry = grupoMap.get(grupoId)!;
          entry.saldoInicial    += saldoInicialBs;
          entry.ingresosExIvaRaw += exIva;
          entry.salidasBsRaw    += salidasBs;
        }

        const grupoValsBalance = [...grupoMap.values()].sort((a, b) => a.grupoCodigo.localeCompare(b.grupoCodigo));
        const grupos = grupoValsBalance.map(g => {
            const saldoInicial      = Math.round(g.saldoInicial * 100) / 100;
            const ingresoMateriales = Math.round(g.ingresosExIvaRaw * 100) / 100;
            const salidaMateriales  = Math.round(g.salidasBsRaw * 100) / 100;
            const saldoFinal        = Math.round((saldoInicial + ingresoMateriales - salidaMateriales) * 100) / 100;
            return { grupoCodigo: g.grupoCodigo, grupoNombre: g.grupoNombre, saldoInicial, ingresoMateriales, salidaMateriales, saldoFinal };
          });

        // Totales desde raw (antes del redondeo de grupo) para coincidir exactamente con
        // cuadro-suministros y diario-almacenes: acumular raw → redondear una sola vez al final.
        const _tSaldoInicial      = Math.round(grupoValsBalance.reduce((a, g) => a + g.saldoInicial,      0) * 100) / 100;
        const _tIngresoMateriales = Math.round(grupoValsBalance.reduce((a, g) => a + g.ingresosExIvaRaw,  0) * 100) / 100;
        const _tSalidaMateriales  = Math.round(grupoValsBalance.reduce((a, g) => a + g.salidasBsRaw,      0) * 100) / 100;
        const totales = {
          saldoInicial:      _tSaldoInicial,
          ingresoMateriales: _tIngresoMateriales,
          salidaMateriales:  _tSalidaMateriales,
          saldoFinal:        Math.round((_tSaldoInicial + _tIngresoMateriales - _tSalidaMateriales) * 100) / 100,
        };

        return { anio, mes, esCerrado, grupos, totales };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin, totalMeses: meses.length }, "Balance mensual por rango generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getInventarioAlmacen(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);
    const gasolinaId = await prisma.producto.findFirst({ where: { codigo: CODIGO_GASOLINA }, select: { id: true } }).then(p => p?.id ?? -1);

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
            select: { productoId: true, cantidadRecibida: true, precioUnit: true, compra: { select: { tieneIva: true } } },
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

        const esEspecialMes = anio === 2025 && (mes === 11 || mes === 12);
        const gasEsp = (pid: number) => esEspecialMes && pid === gasolinaId;

        // Mismo patrón que getBalanceMensual: precio unificado + salidaBsMap sin redondear por movimiento
        const compraMap = new Map<number, { qty: number; bs: number; sinIvaRaw: number }>();
        for (const item of compraItemsRaw) {
          const e      = compraMap.get(item.productoId) ?? { qty: 0, bs: 0, sinIvaRaw: 0 };
          const qty    = Number(item.cantidadRecibida);
          const bsItem = qty * Number(item.precioUnit);
          e.qty       += qty;
          e.bs        += bsItem;
          e.sinIvaRaw += sinIvaIngresoRaw(bsItem, gasEsp(item.productoId), item.compra.tieneIva);
          compraMap.set(item.productoId, e);
        }

        // Precio unificado: precioUnitProm → precioUnit → menos13(compraAvg)
        const precioFinalMap = new Map<number, number>();
        for (const r of registros) {
          const prom  = Number(r.precioUnitProm ?? 0);
          const unit  = Number(r.precioUnit ?? 0);
          const compra = compraMap.get(r.productoId);
          const compraFallback = compra && compra.qty > 0 ? menos13(compra.bs / compra.qty) : 0;
          precioFinalMap.set(r.productoId, prom > 0 ? prom : unit > 0 ? unit : compraFallback);
        }

        const salidaQtyMap = new Map<number, number>();
        for (const mov of salidasMovs) {
          salidaQtyMap.set(mov.productoId, (salidaQtyMap.get(mov.productoId) ?? 0) + Number(mov.cantidad));
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
            saldoInicialRaw: number;
            ingresosExIvaRaw: number;  // sin-IVA acumulado por producto (sinIvaIngreso ya aplicado)
            salidasBsRaw: number;
          }
        >();

        for (const r of registros) {
          const cat = r.producto.categoria;
          const esSubGrupo = cat.parent !== null;
          const grupo = esSubGrupo ? cat.parent! : cat;
          const subGrupo = esSubGrupo ? cat : null;

          if (!grupoMap.has(grupo.id)) {
            grupoMap.set(grupo.id, { codigo: grupo.codigo, nombre: grupo.nombre, subGrupos: new Map(), saldoInicialRaw: 0, ingresosExIvaRaw: 0, salidasBsRaw: 0 });
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

          const compra       = compraMap.get(r.productoId);
          const precioUnit   = precioFinalMap.get(r.productoId) ?? 0;
          const ingresoQty   = compra?.qty ?? Number(r.ingresoQty);
          const salidaQty    = salidaQtyMap.has(r.productoId) ? salidaQtyMap.get(r.productoId)! : Number(r.salidaQty);
          const saldoInicial = Number(r.saldoInicial);
          const saldoFinal   = saldoInicial + ingresoQty - salidaQty;

          const saldoInicialBs = r.totalBsInicial !== null && r.totalBsInicial !== undefined
            ? Math.round(Number(r.totalBsInicial) * 100) / 100
            : Math.round(saldoInicial * precioUnit * 100) / 100;
          const ingresosBs    = compra?.sinIvaRaw ?? 0;  // pre-computado por item con tieneIva
          // totalBs = saldoFinal × CPP evita el error de redondeo cuando salidaQty × CPP_redondeado ≠ ingresosBs
          const totalBs       = Math.round(saldoFinal * precioUnit * 100) / 100;
          // salidasBsProd derivado para que la acumulación al grupo sea coherente con totalBs
          const salidasBsProd = saldoInicialBs + ingresosBs - totalBs;

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

          grupoEntry.saldoInicialRaw   += saldoInicialBs;
          grupoEntry.ingresosExIvaRaw  += ingresosBs;   // sinIvaIngreso ya aplicado por producto
          grupoEntry.salidasBsRaw      += salidasBsProd;
        }

        const grupoValsInv = [...grupoMap.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
        const grupos = grupoValsInv.map((g) => {
            const saldoInicial      = Math.round(g.saldoInicialRaw * 100) / 100;
            const ingresoMateriales = Math.round(g.ingresosExIvaRaw * 100) / 100;
            const salidaMateriales  = Math.round(g.salidasBsRaw * 100) / 100;
            const totalBs           = Math.round((saldoInicial + ingresoMateriales - salidaMateriales) * 100) / 100;
            return {
              codigo: g.codigo,
              nombre: g.nombre,
              saldoInicial,
              ingresoMateriales,
              salidaMateriales,
              totalBs,
              subGrupos: [...g.subGrupos.values()].sort((a, b) => a.codigo.localeCompare(b.codigo)),
            };
          });

        // Totales desde raw para coincidir con balance-mensual, cuadro-suministros y diario-almacenes.
        const _tSaldoInicial      = Math.round(grupoValsInv.reduce((a, g) => a + g.saldoInicialRaw,   0) * 100) / 100;
        const _tIngresoMateriales = Math.round(grupoValsInv.reduce((a, g) => a + g.ingresosExIvaRaw,  0) * 100) / 100;
        const _tSalidaMateriales  = Math.round(grupoValsInv.reduce((a, g) => a + g.salidasBsRaw,      0) * 100) / 100;
        const totalGeneral = Math.round((_tSaldoInicial + _tIngresoMateriales - _tSalidaMateriales) * 100) / 100;

        // Ajuste last-absorbs: el último grupo CON SALDO ≠ 0 absorbe el residuo de redondeo,
        // y dentro de cada grupo el último producto CON SALDO ≠ 0 absorbe el residuo del grupo.
        // Productos y grupos con saldo 0 nunca absorben residuos ajenos.
        const grupoRounded = grupos.map(g => Math.round(g.totalBs * 100) / 100);
        const grupoAbsIdx  = grupoRounded.reduce((acc, v, i) => (v !== 0 ? i : acc), grupos.length - 1);
        const othersGrupoSum = grupoRounded.reduce((s, v, i) => (i !== grupoAbsIdx ? s + v : s), 0);
        grupoRounded[grupoAbsIdx] = Math.round((totalGeneral - othersGrupoSum) * 100) / 100;

        const gruposFinales = grupos.map((g, gi) => {
          const grupoTotalBs = grupoRounded[gi]!;

          const subGruposClone = g.subGrupos.map(sg => ({
            ...sg,
            productos: sg.productos.map(p => ({ ...p })),
          }));

          const allProds: Array<[number, number]> = [];
          subGruposClone.forEach((sg, si) => {
            sg.productos.forEach((_, pi) => allProds.push([si, pi]));
          });

          const prodRounded   = allProds.map(([si, pi]) =>
            Math.round(subGruposClone[si]!.productos[pi]!.totalBs * 100) / 100,
          );
          const prodAbsIdx    = prodRounded.reduce((acc, v, i) => (v !== 0 ? i : acc), allProds.length - 1);
          const othersProdSum = prodRounded.reduce((s, v, i) => (i !== prodAbsIdx ? s + v : s), 0);
          prodRounded[prodAbsIdx] = Math.round((grupoTotalBs - othersProdSum) * 100) / 100;

          allProds.forEach(([si, pi], idx) => {
            subGruposClone[si]!.productos[pi]!.totalBs = prodRounded[idx]!;
          });

          return { ...g, totalBs: grupoTotalBs, subGrupos: subGruposClone };
        });

        return { anio, mes, esCerrado, grupos: gruposFinales, totalGeneral };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin, totalMeses: meses.length }, "Inventario almacén por rango generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getEntradasAlmacen(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);
    const gasolinaId = await prisma.producto.findFirst({ where: { codigo: CODIGO_GASOLINA }, select: { id: true } }).then(p => p?.id ?? -1);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));

        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        const esEspecialMes = anio === 2025 && (mes === 11 || mes === 12);
        const gasEsp = (pid: number) => esEspecialMes && pid === gasolinaId;

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
            compra: { select: { tieneIva: true } },
          },
        });

        // Agregar por producto usando el precioUnit real de cada CompraItem
        const prodMap = new Map<
          number,
          { producto: (typeof compraItems)[0]["producto"]; ingresoQty: number; ingresosBs: number; sinIvaRaw: number }
        >();

        for (const item of compraItems) {
          const pid = item.productoId;
          if (!prodMap.has(pid)) {
            prodMap.set(pid, { producto: item.producto, ingresoQty: 0, ingresosBs: 0, sinIvaRaw: 0 });
          }
          const entry  = prodMap.get(pid)!;
          const qty    = Number(item.cantidadRecibida);
          const precio = Number(item.precioUnit);
          const bsItem = qty * precio;
          entry.ingresoQty += qty;
          entry.ingresosBs += bsItem;
          entry.sinIvaRaw  += sinIvaIngresoRaw(bsItem, gasEsp(pid), item.compra.tieneIva);
        }

        const grupoMap = new Map<
          number,
          {
            codigo: string;
            nombre: string;
            subGrupos: Map<number, {
              codigo: string;
              nombre: string;
              productos: Array<{
                codigo: string; nombre: string; unidad: string;
                ingresoQty: number;
                precioUnit: number; precioUnitMenos13: number;
                totalBsEntrada: number; totalBsEntradaMenos13: number;
              }>;
            }>;
            totalBsEntradaRaw: number;  // con IVA acumulado raw
            totalBsMenos13Raw: number;  // sin IVA acumulado raw: × 0.87 por producto primero
          }
        >();

        for (const { producto, ingresoQty, ingresosBs, sinIvaRaw } of prodMap.values()) {
          const cat       = producto.categoria;
          const esSubGrupo = cat.parent !== null;
          const grupo     = esSubGrupo ? cat.parent! : cat;
          const subGrupo  = esSubGrupo ? cat : null;

          if (!grupoMap.has(grupo.id)) {
            grupoMap.set(grupo.id, { codigo: grupo.codigo, nombre: grupo.nombre, subGrupos: new Map(), totalBsEntradaRaw: 0, totalBsMenos13Raw: 0 });
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

          // Precio: promedio ponderado de las compras del período (todos los decimales primero)
          const precioUnitRaw     = ingresosBs / ingresoQty;
          const precioUnit        = Math.round(precioUnitRaw * 100) / 100;
          const precioUnitMenos13 = Math.round(sinIvaRaw / ingresoQty * 100) / 100;
          const totalBsEntrada    = Math.round(ingresosBs * 100) / 100;
          // pre-computado por item con tieneIva, acumulado sin redondear
          const totalBsMenos13Raw = sinIvaRaw;
          const totalBsEntradaMenos13 = Math.round(totalBsMenos13Raw * 100) / 100;

          grupoEntry.subGrupos.get(subGrupoId)!.productos.push({
            codigo: producto.codigo,
            nombre: producto.nombre,
            unidad: producto.unidad,
            ingresoQty,
            precioUnit,
            precioUnitMenos13,
            totalBsEntrada,
            totalBsEntradaMenos13,
          });

          grupoEntry.totalBsEntradaRaw += ingresosBs;
          grupoEntry.totalBsMenos13Raw += totalBsMenos13Raw;
        }

        const grupos = [...grupoMap.values()]
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
          .map((g) => {
            const totalBsEntrada        = Math.round(g.totalBsEntradaRaw * 100) / 100;
            const totalBsEntradaMenos13 = Math.round(g.totalBsMenos13Raw * 100) / 100;
            return {
              codigo: g.codigo,
              nombre: g.nombre,
              totalBsEntrada,
              totalBsEntradaMenos13,
              subGrupos: [...g.subGrupos.values()]
                .sort((a, b) => a.codigo.localeCompare(b.codigo))
                .map((sg) => ({
                  ...sg,
                  productos: sg.productos.sort((a, b) => a.codigo.localeCompare(b.codigo)),
                })),
            };
          });

        const rawGroups           = [...grupoMap.values()];
        const _globalEntradaRaw   = rawGroups.reduce((a, g) => a + g.totalBsEntradaRaw, 0);
        const _globalMenos13Raw   = rawGroups.reduce((a, g) => a + g.totalBsMenos13Raw, 0);
        const totalGeneral        = Math.round(_globalEntradaRaw * 100) / 100;
        const totalGeneralMenos13 = Math.round(_globalMenos13Raw * 100) / 100;

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
            select: { productoId: true, precioUnit: true, precioUnitProm: true },
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
          saldosMes.map((s: any) => {
            const prom = Number(s.precioUnitProm ?? 0) > 0 ? Number(s.precioUnitProm) : Number(s.precioUnit ?? 0);
            if (prom > 0) return [s.productoId, prom];
            const totalBs = compraAvgMapSalidas.get(s.productoId) ?? 0;
            const totalQty = compraQtyMapSalidas.get(s.productoId) ?? 0;
            return [s.productoId, totalQty > 0 ? menos13(totalBs / totalQty) : 0];
          }),
        );

        // Acumular Bs por movimiento sin redondear (igual que balance-mensual)
        type ProdEntry = { producto: typeof movimientos[0]["producto"]; salidaQty: number; salidaBsRaw: number };
        const prodMap = new Map<number, ProdEntry>();
        for (const mov of movimientos) {
          const pid = mov.productoId;
          if (!prodMap.has(pid)) {
            prodMap.set(pid, { producto: mov.producto, salidaQty: 0, salidaBsRaw: 0 });
          }
          const precio = precioHistoricoMap.get(pid) ?? 0;
          const entry = prodMap.get(pid)!;
          entry.salidaQty   += Number(mov.cantidad);
          entry.salidaBsRaw += Number(mov.cantidad) * precio;
        }

        const grupoMap = new Map<
          number,
          {
            codigo: string;
            nombre: string;
            subGrupos: Map<number, { codigo: string; nombre: string; productos: Array<{ codigo: string; nombre: string; unidad: string; salidaQty: number; precioUnit: number; totalBsSalida: number }> }>;
            totalBsSalidaRaw: number;  // sin redondear; redondeo al nivel de grupo
          }
        >();

        for (const { producto, salidaQty, salidaBsRaw } of prodMap.values()) {
          const cat = producto.categoria;
          const esSubGrupo = cat.parent !== null;
          const grupo = esSubGrupo ? cat.parent! : cat;
          const subGrupo = esSubGrupo ? cat : null;

          if (!grupoMap.has(grupo.id)) {
            grupoMap.set(grupo.id, { codigo: grupo.codigo, nombre: grupo.nombre, subGrupos: new Map(), totalBsSalidaRaw: 0 });
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

          const precioUnit = precioHistoricoMap.get(producto.id) ?? 0;

          grupoEntry.subGrupos.get(subGrupoId)!.productos.push({
            codigo: producto.codigo,
            nombre: producto.nombre,
            unidad: producto.unidad,
            salidaQty,
            precioUnit,
            totalBsSalida: Math.round(salidaBsRaw * 100) / 100,
          });
          grupoEntry.totalBsSalidaRaw += salidaBsRaw;  // acumular raw, redondear al final
        }

        const grupoValsSalidas = [...grupoMap.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
        const grupos = grupoValsSalidas.map((g) => {
            const totalBsSalida = Math.round(g.totalBsSalidaRaw * 100) / 100;
            return {
              codigo: g.codigo,
              nombre: g.nombre,
              totalBsSalida,
              totalBsSalidaMenos13: totalBsSalida,
              subGrupos: [...g.subGrupos.values()]
                .sort((a, b) => a.codigo.localeCompare(b.codigo))
                .map((sg) => ({
                  ...sg,
                  productos: sg.productos.sort((a, b) => a.codigo.localeCompare(b.codigo)),
                })),
            };
          });

        // Raw → round una vez, igual que balance-mensual e inventario-almacen.
        const totalGeneral        = Math.round(grupoValsSalidas.reduce((acc, g) => acc + g.totalBsSalidaRaw, 0) * 100) / 100;
        const totalGeneralMenos13 = totalGeneral;

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
            select: { productoId: true, precioUnit: true, precioUnitProm: true },
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
          saldosMes.map((s: any) => [s.productoId, Number(s.precioUnitProm ?? 0) > 0 ? Number(s.precioUnitProm) : Number(s.precioUnit ?? 0)]),
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

        // lineaMap.importeBs es raw (antes del .map() que lo redondea en lineas[]).
        // Raw → round una vez para que coincida con balance-mensual y diario-almacenes.
        const totalGeneral = Math.round([...lineaMap.values()].reduce((acc, l) => acc + l.importeBs, 0) * 100) / 100;

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
    const gasolinaId = await prisma.producto.findFirst({ where: { codigo: CODIGO_GASOLINA }, select: { id: true } }).then(p => p?.id ?? -1);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));
        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        const esEspecialMes = anio === 2025 && (mes === 11 || mes === 12);
        const gasEsp = (pid: number) => esEspecialMes && pid === gasolinaId;

        const [saldosMesActual, compraItemsRaw, movimentosRaw, anulacionValeMovsDiario, valesDelMes] = await Promise.all([
          (prisma.saldoMensual.findMany as any)({
            where: { anio, mes },
            select: {
              productoId: true, precioUnit: true, precioUnitProm: true, saldoInicial: true, totalBsInicial: true,
              producto: { select: { categoria: { select: { id: true, parent: { select: { id: true } } } } } },
            },
          }) as Promise<{ productoId: number; precioUnit: unknown; precioUnitProm: unknown; saldoInicial: unknown; totalBsInicial: unknown; producto: { categoria: { id: number; parent: { id: number } | null } } }[]>,
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
            select: { productoId: true, cantidadRecibida: true, precioUnit: true, compra: { select: { tieneIva: true } } },
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
              cuenta:    { include: { centroCosto: true, funcionGasto: true, sector: true } },
              producto:  { select: { id: true, nombre: true, unidad: true } },
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
          (prisma.vale.findMany as any)({
            where: {
              OR: [
                { fechaOperacion: { gte: startOfMonth, lt: endOfMonth } },
                { fechaOperacion: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
              ],
            },
            select: {
              id:             true,
              fechaOperacion: true,
              createdAt:      true,
              solicitante:    { select: { id: true, nombre: true } },
              superintendente:{ select: { id: true, nombre: true } },
            },
            orderBy: [{ fechaOperacion: "asc" }, { createdAt: "asc" }],
          }) as Promise<any[]>,
        ]);

        const valesAnuladosIdsDiario = new Set(
          anulacionValeMovsDiario.map(m => m.referenciaId).filter((id): id is string => id !== null),
        );
        const movimientos = movimentosRaw.filter(
          m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIdsDiario.has(m.referenciaId)),
        );

        // Mapa de vales del mes (excluye anulados) para lookup rápido por ID
        const valeInfoMap = new Map<string, any>(
          valesDelMes
            .filter((v: any) => !valesAnuladosIdsDiario.has(v.id))
            .map((v: any) => [v.id, v]),
        );

        const precioMap = new Map<number, number>(
          saldosMesActual.map((s: any) => [s.productoId, Number(s.precioUnitProm ?? 0) > 0 ? Number(s.precioUnitProm) : Number(s.precioUnit ?? 0)]),
        );

        // Compra-average fallback for products with precioUnitProm=0 in SaldoMensual
        const compraAccDiario = new Map<number, { totalBs: number; qty: number; sinIvaRaw: number }>();
        for (const item of compraItemsRaw) {
          const e      = compraAccDiario.get(item.productoId) ?? { totalBs: 0, qty: 0, sinIvaRaw: 0 };
          const qty    = Number(item.cantidadRecibida);
          const bsItem = qty * Number(item.precioUnit);
          e.totalBs   += bsItem;
          e.qty        += qty;
          e.sinIvaRaw  += sinIvaIngresoRaw(bsItem, gasEsp(item.productoId), item.compra.tieneIva);
          compraAccDiario.set(item.productoId, e);
        }
        const compraAvgDiario = new Map<number, number>(
          [...compraAccDiario.entries()].map(([pid, { totalBs, qty }]) => [pid, qty > 0 ? totalBs / qty : 0]),
        );

        // DEBE: saldo inventario al inicio del mes (ex-IVA desde DB).
        // Redondea por producto igual que balance-mensual para que los totales coincidan.
        const saldoInventarioAnterior = saldosMesActual.reduce((acc, s: any) => {
          if (s.totalBsInicial !== null && s.totalBsInicial !== undefined) {
            return acc + Number(s.totalBsInicial);
          }
          const _ps  = Number(s.precioUnitProm ?? 0) > 0 ? Number(s.precioUnitProm) : Number(s.precioUnit ?? 0);
          const _avg = compraAvgDiario.get(s.productoId) ?? 0;
          const precio = _ps > 0 ? _ps : (_avg > 0 ? menos13(_avg) : 0);
          // round por producto (mismo criterio que balance-mensual y saldos-iniciales)
          return acc + Math.round(Number(s.saldoInicial) * precio * 100) / 100;
        }, 0);

        // comprasImporteBs: total con IVA para mostrar
        let comprasImporteBs = 0;
        for (const item of compraItemsRaw) {
          comprasImporteBs += Number(item.cantidadRecibida) * Number(item.precioUnit);
        }

        // comprasSinIva: pre-computado por item con tieneIva, acumulado raw → redondear una vez al final
        const grupoIngMap = new Map<number, number>();
        for (const s of saldosMesActual) {
          const grupoId  = s.producto.categoria.parent?.id ?? s.producto.categoria.id;
          const exIvaRaw = compraAccDiario.get(s.productoId)?.sinIvaRaw ?? 0;
          grupoIngMap.set(grupoId, (grupoIngMap.get(grupoId) ?? 0) + exIvaRaw);
        }
        // Acumular raw (sin redondear por grupo) → redondear una vez al final, igual que cuadro-suministros y balance-mensual.
        const comprasSinIva = Math.round(
          [...grupoIngMap.values()].reduce((a, g) => a + g, 0) * 100,
        ) / 100;

        const totalInventarioDebe = saldoInventarioAnterior + comprasSinIva;

        // HABER: un solo loop acumula tanto sectoresHaber (imagen 1) como cuentasHaber (imágenes 2 y 3).
        // sectoresHaber: Sector → FuncionGasto (agrupado entre todos los centroCostos del sector).
        // cuentasHaber:  por codigoCompleto (una entrada por par centroCosto–funcionGasto).
        // Mismo precio sin-IVA en ambas acumulaciones → sub-items suman exactamente a los totales.
        type FgEntry     = { funcionGastoCodigo: string; funcionGastoNombre: string; totalBs: number };
        type SectorEntry = { sectorId: number | null; sectorCodigo: string | null; sectorNombre: string | null; funcionGastos: Map<string, FgEntry>; totalBs: number };
        type LinHaberEntry = { subCentro: string; nombre: string; importeBs: number; subCuentas: string[] };
        type CcHaberEntry = {
          codigoCompleto:     string;
          centroCostoCodigo:  string;
          centroCostoNombre:  string;
          sectorNombre:       string | null;
          sectorKey:          number;   // sectorId ?? -1, para agrupar en last-absorbs
          funcionGastoCodigo: string;
          funcionGastoNombre: string;
          esTransporte:       boolean;
          lineas:             Map<string, LinHaberEntry>;
          totalBs:            number;
          totalCantidad:      number;
        };

        type ValeLinea = { productoId: number; nombre: string; unidad: string; cantidad: number; precioUnit: number; importeBs: number };
        type ValeAcum  = { totalBs: number; lineas: Map<number, ValeLinea> };

        const sectorMap  = new Map<number, SectorEntry>();
        const ccHaberMap = new Map<string, CcHaberEntry>();
        const sectorVales = new Map<number, Map<string, ValeAcum>>();

        for (const mov of movimientos) {
          if (!mov.cuenta || !mov.cuentaId) continue;
          const _ps            = precioMap.get(mov.productoId);
          const _compraFallback = compraAvgDiario.get(mov.productoId) ?? 0;
          // Precio siempre sin-IVA; compraAvgDiario viene de facturas (con IVA) → menos13
          const precio = (_ps != null && _ps > 0)
            ? _ps
            : _compraFallback > 0 ? menos13(_compraFallback) : Number(mov.precioUnit);
          const importeBs    = Number(mov.cantidad) * precio;
          const sectorKey    = mov.cuenta.sectorId ?? -1;
          const esTransporte = mov.cuenta.sectorId !== null;

          // -- sectorMap: agrupa por funcionGasto dentro del sector (imagen 1) --
          if (!sectorMap.has(sectorKey)) {
            sectorMap.set(sectorKey, {
              sectorId:      mov.cuenta.sectorId ?? null,
              sectorCodigo:  mov.cuenta.sector?.codigo ?? null,
              sectorNombre:  mov.cuenta.sector?.nombre ?? null,
              funcionGastos: new Map(),
              totalBs:       0,
            });
          }
          const sectorEntry = sectorMap.get(sectorKey)!;
          sectorEntry.totalBs += importeBs;

          const fgCodigo = mov.cuenta.funcionGasto.codigo;
          if (!sectorEntry.funcionGastos.has(fgCodigo)) {
            sectorEntry.funcionGastos.set(fgCodigo, {
              funcionGastoCodigo: fgCodigo,
              funcionGastoNombre: mov.cuenta.funcionGasto.nombre,
              totalBs: 0,
            });
          }
          sectorEntry.funcionGastos.get(fgCodigo)!.totalBs += importeBs;

          // Acumula vale por sector con detalle de producto
          if (mov.referencia === "VALE" && mov.referenciaId) {
            if (!sectorVales.has(sectorKey)) sectorVales.set(sectorKey, new Map());
            const vm = sectorVales.get(sectorKey)!;
            if (!vm.has(mov.referenciaId)) vm.set(mov.referenciaId, { totalBs: 0, lineas: new Map() });
            const ve = vm.get(mov.referenciaId)!;
            ve.totalBs += importeBs;
            if (!ve.lineas.has(mov.productoId)) {
              ve.lineas.set(mov.productoId, {
                productoId: mov.productoId,
                nombre:     (mov as any).producto?.nombre ?? String(mov.productoId),
                unidad:     (mov as any).producto?.unidad ?? "",
                cantidad:   0,
                precioUnit: precio,
                importeBs:  0,
              });
            }
            const lin = ve.lineas.get(mov.productoId)!;
            lin.cantidad  += Number(mov.cantidad);
            lin.importeBs += importeBs;
          }

          // -- ccHaberMap: por codigoCompleto (imágenes 2 y 3) --
          const cc = mov.cuenta.codigoCompleto;
          if (!ccHaberMap.has(cc)) {
            ccHaberMap.set(cc, {
              codigoCompleto:     cc,
              centroCostoCodigo:  mov.cuenta.centroCosto.codigo,
              centroCostoNombre:  mov.cuenta.centroCosto.nombre,
              sectorNombre:       mov.cuenta.sector?.nombre ?? null,
              sectorKey,
              funcionGastoCodigo: mov.cuenta.funcionGasto.codigo,
              funcionGastoNombre: mov.cuenta.funcionGasto.nombre,
              esTransporte,
              lineas:        new Map(),
              totalBs:       0,
              totalCantidad: 0,
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

        // totalSalidasHaber: acumular raw → redondear una sola vez (igual que balance-mensual).
        const totalSalidasHaber = Math.round([...sectorMap.values()].reduce((acc, s) => acc + s.totalBs, 0) * 100) / 100;

        // saldoInventarioFinal (HABER): totalInventarioDebe - totalSalidasHaber → DEBE = HABER.
        const saldoInventarioFinal = Math.round((totalInventarioDebe - totalSalidasHaber) * 100) / 100;

        // Paso 1: sectorTotalBsMap — totalBs_2dp por sector con último-absorbe.
        // sum(sector.totalBs_2dp) === totalSalidasHaber exactamente.
        const sectorTotalBsMap = new Map<number, number>();
        const sectorValsSorted = [...sectorMap.values()]
          .sort((a, b) => (a.sectorCodigo ?? "").localeCompare(b.sectorCodigo ?? "", undefined, { numeric: true }));
        {
          let acc = 0;
          for (let si = 0; si < sectorValsSorted.length; si++) {
            const s    = sectorValsSorted[si]!;
            const isLast = si === sectorValsSorted.length - 1;
            const v  = isLast ? Math.round((totalSalidasHaber - acc) * 100) / 100
                              : Math.round(s.totalBs * 100) / 100;
            if (!isLast) acc += v;
            sectorTotalBsMap.set(s.sectorId ?? -1, v);
          }
        }

        // Paso 2: cuentasHaber con último-absorbe por sector, acumulando fg ajustados.
        // fgBySector[sk][fg] = suma de cuentasHaber.totalBs_2dp para ese fg en ese sector.
        // sectoresHaber.funcionGastos se deriva de fgBySector → valores coherentes con lo que
        // el reporte muestra en IMPORTE y SUB TOTALES (ambas columnas suman igual).
        type FgAdjEntry = { funcionGastoCodigo: string; funcionGastoNombre: string; totalBs: number };
        const fgBySector = new Map<number, Map<string, FgAdjEntry>>();

        const ccEntriesSorted = [...ccHaberMap.values()]
          .sort((a, b) => a.codigoCompleto.localeCompare(b.codigoCompleto));
        const ccBySector = new Map<number, typeof ccEntriesSorted>();
        for (const e of ccEntriesSorted) {
          if (!ccBySector.has(e.sectorKey)) ccBySector.set(e.sectorKey, []);
          ccBySector.get(e.sectorKey)!.push(e);
        }

        const cuentasHaberArr: object[] = [];
        for (const [sk, entries] of ccBySector) {
          const sectorTotal2dp = sectorTotalBsMap.get(sk)
            ?? Math.round(entries.reduce((a, e) => a + e.totalBs, 0) * 100) / 100;
          if (!fgBySector.has(sk)) fgBySector.set(sk, new Map());
          const fgMap = fgBySector.get(sk)!;

          let entryAccum = 0;
          for (let i = 0; i < entries.length; i++) {
            const entry  = entries[i]!;
            const isLast = i === entries.length - 1;
            const totalBs = isLast
              ? Math.round((sectorTotal2dp - entryAccum) * 100) / 100
              : Math.round(entry.totalBs * 100) / 100;
            if (!isLast) entryAccum += totalBs;

            // Acumular fg ajustado para sectoresHaber.funcionGastos
            const fc = entry.funcionGastoCodigo;
            if (!fgMap.has(fc)) {
              fgMap.set(fc, { funcionGastoCodigo: fc, funcionGastoNombre: entry.funcionGastoNombre, totalBs: 0 });
            }
            fgMap.get(fc)!.totalBs += totalBs;

            const base = {
              codigoCompleto:    entry.codigoCompleto,
              centroCostoCodigo: entry.centroCostoCodigo,
              centroCostoNombre: entry.centroCostoNombre,
              sectorNombre:      entry.sectorNombre,
              esTransporte:      entry.esTransporte,
            };
            if (entry.esTransporte) {
              cuentasHaberArr.push({ ...base, totalBs, totalCantidad: entry.totalCantidad });
            } else {
              const lineasSorted = [...entry.lineas.values()]
                .sort((a, b) => a.subCentro.localeCompare(b.subCentro, undefined, { numeric: true }));
              let lineaAccum = 0;
              const lineas = lineasSorted.map((l, li) => {
                const isLastLinea = li === lineasSorted.length - 1;
                const importeBs = isLastLinea
                  ? Math.round((totalBs - lineaAccum) * 1000) / 1000
                  : Math.round(l.importeBs * 1000) / 1000;
                if (!isLastLinea) lineaAccum += importeBs;
                return { ...l, importeBs, subCuentas: [...l.subCuentas].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) };
              });
              cuentasHaberArr.push({ ...base, totalBs, lineas });
            }
          }
        }

        // Paso 3: sectoresHaber — sector.totalBs desde sectorTotalBsMap; funcionGastos desde fgBySector.
        // Así funcionGastos.totalBs === sum(cuentasHaber.totalBs con mismo fg y sector) exactamente.
        const sectoresHaber = sectorValsSorted.map((s) => {
          const sk           = s.sectorId ?? -1;
          const sectorTotalBs = sectorTotalBsMap.get(sk)!;
          const fgMap        = fgBySector.get(sk) ?? new Map<string, FgAdjEntry>();
          const funcionGastos = [...fgMap.values()]
            .sort((a, b) => a.funcionGastoCodigo.localeCompare(b.funcionGastoCodigo, undefined, { numeric: true }));

          const valeAmounts = sectorVales.get(sk) ?? new Map<string, ValeAcum>();
          const vales = [...valeAmounts.entries()]
            .filter(([id]) => valeInfoMap.has(id))
            .sort(([idA], [idB]) => {
              const a = valeInfoMap.get(idA) as any;
              const b = valeInfoMap.get(idB) as any;
              return ((a.fechaOperacion ?? a.createdAt) as Date).getTime()
                   - ((b.fechaOperacion ?? b.createdAt) as Date).getTime();
            })
            .map(([id, acum]) => {
              const v = valeInfoMap.get(id) as any;
              const lineas = [...acum.lineas.values()]
                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                .map(l => ({
                  productoId: l.productoId,
                  nombre:     l.nombre,
                  unidad:     l.unidad,
                  cantidad:   Math.round(l.cantidad * 100) / 100,
                  precioUnit: Math.round(l.precioUnit * 1000) / 1000,
                  importeBs:  Math.round(l.importeBs * 100) / 100,
                }));
              return {
                id,
                fechaOperacion:  v.fechaOperacion  ?? null,
                solicitante:     v.solicitante,
                superintendente: v.superintendente ?? null,
                totalBs:         Math.round(acum.totalBs * 100) / 100,
                lineas,
              };
            });

          return { sectorId: s.sectorId, sectorCodigo: s.sectorCodigo, sectorNombre: s.sectorNombre, totalBs: sectorTotalBs, funcionGastos, vales };
        });

        const cuentasHaber = (cuentasHaberArr as { codigoCompleto: string }[])
          .sort((a, b) => a.codigoCompleto.localeCompare(b.codigoCompleto));

        return {
          anio, mes, esCerrado,
          saldoInventarioAnterior: Math.round(saldoInventarioAnterior * 100) / 100,
          comprasImporteBs:        Math.round(comprasImporteBs * 100) / 100,
          comprasSinIva:           comprasSinIva,
          totalInventarioDebe:     Math.round(totalInventarioDebe * 100) / 100,
          sectoresHaber,
          totalSalidasHaber,
          saldoInventarioFinal,
          cuentasHaber,
        };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Diario almacenes generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getSalidasDetalle(query: SalidasDetalleQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin, cuentaId, funcionGastoCodigo, sectorCodigo, centroCostoCodigo, codigoCuenta, sinCuenta } = query;

    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);
    const periodoOR = rangoMeses.flatMap(({ anio, mes }) => {
      const s = new Date(Date.UTC(anio, mes - 1, 1));
      const e = new Date(Date.UTC(anio, mes, 1));
      return [
        { periodoAnio: anio, periodoMes: mes },
        { periodoAnio: null as null, createdAt: { gte: s, lt: e } },
      ];
    });

    const [movimentosRaw, anulaciones, saldosRango] = await Promise.all([
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
            if (centroCostoCodigo) cf.centroCosto      = { codigo: centroCostoCodigo };
            if (funcionGastoCodigo) cf.funcionGasto    = { codigo: funcionGastoCodigo };
            if (sectorCodigo)       cf.sector          = { codigo: sectorCodigo };
            if (codigoCuenta)       cf.codigoCompleto  = { contains: codigoCuenta };
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
      // Precios del SaldoMensual para todos los meses del rango
      prisma.saldoMensual.findMany({
        where: { OR: rangoMeses.map(({ anio, mes }) => ({ anio, mes })) },
        select: { productoId: true, anio: true, mes: true, precioUnit: true, precioUnitProm: true },
      }),
    ]);

    // key: `productoId_anio_mes` → precioUnit del SaldoMensual
    const precioMesKey = (pid: number, anio: number, mes: number) => `${pid}_${anio}_${mes}`;
    const precioMesMap = new Map<string, number>();
    for (const s of saldosRango) {
      const prom = Number(s.precioUnitProm ?? 0) > 0 ? Number(s.precioUnitProm) : Number(s.precioUnit ?? 0);
      precioMesMap.set(precioMesKey(s.productoId, s.anio, s.mes), prom > 0 ? prom : Number(s.precioUnit));
    }

    const valesAnuladosIds = new Set(
      anulaciones.map(m => m.referenciaId).filter((id): id is string => id !== null),
    );

    const movimientos = movimentosRaw.filter(
      m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIds.has(m.referenciaId)),
    );

    const items = movimientos.map(m => {
      // Determinar el período del movimiento
      const pAnio = m.periodoAnio ?? m.createdAt.getUTCFullYear();
      const pMes  = m.periodoMes  ?? (m.createdAt.getUTCMonth() + 1);
      // Precio: SaldoMensual del período → fallback al precio del movimiento
      const precioSaldo = precioMesMap.get(precioMesKey(m.productoId, pAnio, pMes));
      const precioUnit  = (precioSaldo != null && precioSaldo > 0) ? precioSaldo : Number(m.precioUnit);
      const importeBs   = Math.round(Number(m.cantidad) * precioUnit * 100) / 100;
      return {
        id:             m.id,
        fecha:          m.createdAt,
        periodoAnio:    pAnio,
        periodoMes:     pMes,
        referencia:     m.referencia ?? null,
        referenciaId:   m.referenciaId ?? null,
        productoId:     m.productoId,
        productoCodigo: m.producto.codigo,
        productoNombre: m.producto.nombre,
        productoUnidad: m.producto.unidad,
        cantidad:       Number(m.cantidad),
        precioUnit,
        salidaBs:       importeBs,
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
      };
    });

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
        codigoCuenta:       codigoCuenta       ?? null,
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
    const gasolinaId = await prisma.producto.findFirst({ where: { codigo: CODIGO_GASOLINA }, select: { id: true } }).then(p => p?.id ?? -1);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));
        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        const esEspecialMes = anio === 2025 && (mes === 11 || mes === 12);
        const gasEsp = (pid: number) => esEspecialMes && pid === gasolinaId;

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

        // Acumular × 0.87 por producto primero (todos los decimales), sumar al proveedor/total al final
        const provMap = new Map<number, { proveedor: any; compras: any[]; totalBsRaw: number; totalSinIVARaw: number }>();

        for (const c of comprasRaw) {
          if (!provMap.has(c.proveedorId)) {
            provMap.set(c.proveedorId, { proveedor: c.proveedor, compras: [], totalBsRaw: 0, totalSinIVARaw: 0 });
          }
          const provEntry = provMap.get(c.proveedorId)!;

          let compraBsRaw    = 0;
          let compraSinIVARaw = 0;
          const items = c.items.map((item: any) => {
            const cat     = item.producto.categoria;
            const grupo   = cat.parent !== null ? cat.parent : cat;
            const pid         = item.productoId;
            const cantidad    = Number(item.cantidadRecibida);
            const precioUnit  = Number(item.precioUnit);
            const importeBsRaw    = cantidad * precioUnit;
            // × 0.87 por producto con todos los decimales, sin redondear al acumular
            const importeSinIVARaw = sinIvaIngresoRaw(importeBsRaw, gasEsp(pid), c.tieneIva);
            compraBsRaw    += importeBsRaw;
            compraSinIVARaw += importeSinIVARaw;
            return {
              productoId: pid,
              nombre:     item.producto.nombre,
              unidad:     item.producto.unidad,
              cantidad,
              precioUnit,
              precioUnitMenos13: Math.round(precioUnitSinIvaRaw(precioUnit, gasEsp(pid), c.tieneIva) * 100) / 100,
              importeBs:    Math.round(importeBsRaw * 100) / 100,
              importeSinIVA: Math.round(importeSinIVARaw * 100) / 100,
              grupo: { codigo: grupo.codigo, nombre: grupo.nombre },
            };
          });

          const subtotalBs     = Math.round(compraBsRaw * 100) / 100;
          const subtotalSinIVA = Math.round(compraSinIVARaw * 100) / 100;

          provEntry.compras.push({
            id: c.id,
            numeroFactura:  c.numeroFactura ?? null,
            fechaOperacion: c.fechaOperacion ?? null,
            items,
            subtotalBs,
            subtotalSinIVA,
          });
          provEntry.totalBsRaw    += compraBsRaw;
          provEntry.totalSinIVARaw += compraSinIVARaw;
        }

        const proveedores = [...provMap.values()].map((p) => ({
          proveedor:   p.proveedor,
          compras:     p.compras,
          totalBs:     Math.round(p.totalBsRaw * 100) / 100,
          totalSinIVA: Math.round(p.totalSinIVARaw * 100) / 100,
        }));

        const rawProvs           = [...provMap.values()];
        const _globalBsRaw       = rawProvs.reduce((a, p) => a + p.totalBsRaw, 0);
        const _globalSinIVARaw   = rawProvs.reduce((a, p) => a + p.totalSinIVARaw, 0);
        const totalGeneral       = Math.round(_globalBsRaw * 100) / 100;
        const totalGeneralSinIVA = Math.round(_globalSinIVARaw * 100) / 100;

        return { anio, mes, esCerrado, proveedores, totalGeneral, totalGeneralSinIVA };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Cuadro suministros generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },

  async getComprasConSaldoInicial(query: PeriodoRangoQueryDTO) {
    const { anioInicio, mesInicio, anioFin, mesFin } = query;
    const rangoMeses = generarRangoDeMeses(anioInicio, mesInicio, anioFin, mesFin);

    const meses = await Promise.all(
      rangoMeses.map(async ({ anio, mes }) => {
        const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
        const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

        // Productos que ya tenían stock al inicio del mes
        const saldosConStock = await (prisma.saldoMensual.findMany as any)({
          where: { anio, mes, saldoInicial: { gt: 0 } },
          select: { productoId: true, saldoInicial: true, totalBsInicial: true },
        }) as { productoId: number; saldoInicial: unknown; totalBsInicial: unknown }[];

        if (saldosConStock.length === 0) return { anio, mes, grupos: [], totalGeneral: 0 };

        const productoIds = saldosConStock.map(s => s.productoId);
        const saldoMap = new Map(saldosConStock.map(s => [
          s.productoId,
          {
            qty:  Number(s.saldoInicial),
            bsInicial: s.totalBsInicial != null ? Math.round(Number(s.totalBsInicial) * 100) / 100 : null,
          },
        ]));

        // Compras de esos productos en el período
        const compraItems = await prisma.compraItem.findMany({
          where: {
            productoId: { in: productoIds },
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
            producto: { include: { categoria: { include: { parent: true } } } },
            compra: {
              select: {
                id: true,
                numeroFactura: true,
                fechaOperacion: true,
                recibidoAt: true,
                createdAt: true,
                proveedor: { select: { nombre: true, razonSocial: true } },
              },
            },
          },
          orderBy: [{ producto: { codigo: "asc" } }, { compra: { fechaOperacion: "asc" } }],
        });

        if (compraItems.length === 0) return { anio, mes, grupos: [], totalGeneral: 0 };

        type ProdEntry = {
          codigo: string; nombre: string; unidad: string;
          saldoInicialQty: number; saldoInicialBs: number | null;
          compras: Array<{ fecha: Date | null; numeroFactura: string | null; proveedor: string; cantidad: number; precioUnit: number; importeBs: number }>;
          rawBs: number;
        };
        type GrupoEntry = { grupoCodigo: string; grupoNombre: string; productoMap: Map<number, ProdEntry> };

        const grupoMap = new Map<number, GrupoEntry>();

        for (const item of compraItems) {
          const cat    = item.producto.categoria;
          const grupo  = cat.parent ?? cat;
          if (!grupoMap.has(grupo.id)) {
            grupoMap.set(grupo.id, { grupoCodigo: grupo.codigo, grupoNombre: grupo.nombre, productoMap: new Map() });
          }
          const grupoEntry = grupoMap.get(grupo.id)!;

          if (!grupoEntry.productoMap.has(item.productoId)) {
            const sal = saldoMap.get(item.productoId)!;
            grupoEntry.productoMap.set(item.productoId, {
              codigo: item.producto.codigo,
              nombre: item.producto.nombre,
              unidad: item.producto.unidad,
              saldoInicialQty: sal.qty,
              saldoInicialBs:  sal.bsInicial,
              compras: [],
              rawBs: 0,
            });
          }

          const prod       = grupoEntry.productoMap.get(item.productoId)!;
          const cantidad   = Number(item.cantidadRecibida);
          const precioUnit = Number(item.precioUnit);
          const importeBs  = Math.round(cantidad * precioUnit * 100) / 100;
          const fecha      = item.compra.fechaOperacion ?? item.compra.recibidoAt ?? item.compra.createdAt;
          const proveedor  = item.compra.proveedor?.nombre ?? item.compra.proveedor?.razonSocial ?? "Sin proveedor";

          prod.compras.push({ fecha, numeroFactura: item.compra.numeroFactura ?? null, proveedor, cantidad, precioUnit, importeBs });
          prod.rawBs += importeBs;
        }

        const grupos = [...grupoMap.values()]
          .sort((a, b) => a.grupoCodigo.localeCompare(b.grupoCodigo))
          .map(g => {
            const productos = [...g.productoMap.values()]
              .sort((a, b) => a.codigo.localeCompare(b.codigo))
              .map(p => ({ ...p, totalCompradoBs: Math.round(p.rawBs * 100) / 100, rawBs: undefined }));
            const totalBs = Math.round(productos.reduce((a, p) => a + p.totalCompradoBs, 0) * 100) / 100;
            return { grupoCodigo: g.grupoCodigo, grupoNombre: g.grupoNombre, productos, totalBs };
          });

        const totalGeneral = Math.round(grupos.reduce((a, g) => a + g.totalBs, 0) * 100) / 100;

        return { anio, mes, grupos, totalGeneral };
      }),
    );

    logger.info({ anioInicio, mesInicio, anioFin, mesFin }, "Compras con saldo inicial generado");
    return { anioInicio, mesInicio, anioFin, mesFin, meses };
  },
};
