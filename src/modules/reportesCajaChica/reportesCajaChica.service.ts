import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../errors/http.error.js";
import { generarNumeroComprobanteEgresoGasto } from "../../utils/correlativo.js";
import type { ReporteCajaChicaQuery } from "./reportesCajaChica.types.js";

// Bolivia tiene un tipo de cambio oficial fijo por ley (no flotante) desde
// hace décadas — se usa como respaldo cuando un gasto todavía no pertenece
// a ninguna rendición cerrada (que es la que normalmente trae su propio
// tipoCambio) y hay que generar su Comprobante de Egresos igual.
const TIPO_CAMBIO_BOB_USD_DEFAULT = 6.96;

// Orden y etiquetas exactas del reporte mensual impreso ("Caja Lipeña").
const CATEGORIA_ORDEN = [
  "MATERIALES_SUMINISTROS",
  "TRANSPORTES",
  "ACTIVOS_FIJOS",
  "MANTENIMIENTO_SERVICIOS",
  "OBLIGACIONES_SOCIALES",
  "OBRAS_CONSTRUCCION",
  "GASTOS_ADMINISTRATIVOS",
  "OTROS_GASTOS_ADMINISTRATIVOS",
  "OTROS",
  "MEDIO_AMBIENTE",
] as const;

const CATEGORIA_LABEL: Record<(typeof CATEGORIA_ORDEN)[number], string> = {
  MATERIALES_SUMINISTROS: "MATERIALES Y SUMINISTROS",
  TRANSPORTES: "TRANSPORTES",
  ACTIVOS_FIJOS: "ACTIVOS FIJOS",
  MANTENIMIENTO_SERVICIOS: "MANTENIMIENTO Y OTROS SERVICIOS",
  OBLIGACIONES_SOCIALES: "OBLIGACIONES SOCIALES",
  OBRAS_CONSTRUCCION: "OBRAS EN CONSTRUCCIÓN",
  GASTOS_ADMINISTRATIVOS: "GASTOS ADMINISTRATIVOS",
  OTROS_GASTOS_ADMINISTRATIVOS: "OTROS GASTOS ADMINISTRATIVOS",
  OTROS: "OTROS",
  MEDIO_AMBIENTE: "MEDIO AMBIENTE",
};

function buildWhere(query: ReporteCajaChicaQuery) {
  const where: any = { estado: { not: "ANULADO" } };
  if (query.cajaId) where.cajaId = query.cajaId;
  if (query.fechaInicio || query.fechaFin) {
    where.fecha = {};
    if (query.fechaInicio) where.fecha.gte = query.fechaInicio;
    if (query.fechaFin) where.fecha.lte = query.fechaFin;
  }
  return where;
}

// --- Motor de asiento contable, compartido por el Comprobante Diario de
// una rendición (muchos gastos) y el Comprobante de Egresos de un gasto
// puntual (uno solo) — misma regla de partida doble en los dos lugares,
// escrita una sola vez.
export type LineaComprobante = {
  codigo: string;
  cuentaNombre: string;
  detalle: string;
  debeBs: number;
  haberBs: number;
  debeUsd: number;
  haberUsd: number;
  centroCodigo?: string;
  centroNombre?: string;
  funcionCodigo?: string;
  funcionNombre?: string;
};

type GastoParaComprobante = {
  numeroRespaldo: string | null;
  proveedorNombre: string;
  glosa: string;
  montoTotal: Prisma.Decimal;
  tipoDocumento: string;
  montoCreditoFiscalIva: Prisma.Decimal;
  montoRetencionRcIva: Prisma.Decimal;
  montoRetencionIueCompras: Prisma.Decimal;
  montoRetencionIt: Prisma.Decimal;
  cuentaContableCaja: {
    codigo: string;
    nombre: string;
    requiereCentroCosto: boolean;
    requiereFuncionGasto: boolean;
  } | null;
  centroCostoCaja: { codigo: string; nombre: string } | null;
  funcionGastoCaja: { codigo: string; nombre: string } | null;
};

async function obtenerCuentasMotorTributario() {
  const [cuentaCreditoFiscal, conceptosRetencion] = await Promise.all([
    prisma.cuentaContableCaja.findUnique({ where: { codigo: "69.001.000" } }),
    prisma.conceptoRetencionCaja.findMany({ include: { cuentaContableCaja: true } }),
  ]);
  const cuentaPorRetencion: Record<string, { codigo: string; nombre: string } | undefined> = {
    RC_IVA: conceptosRetencion.find((c) => c.codigo === "RC_IVA")?.cuentaContableCaja,
    IUE_COMPRAS: conceptosRetencion.find((c) => c.codigo === "IUE_COMPRAS")?.cuentaContableCaja,
    IT: conceptosRetencion.find((c) => c.codigo === "IT")?.cuentaContableCaja,
  };
  return { cuentaCreditoFiscal, cuentaPorRetencion };
}

function construirLineasGasto(
  gasto: GastoParaComprobante,
  cuentaCreditoFiscal: { codigo: string; nombre: string } | null,
  cuentaPorRetencion: Record<string, { codigo: string; nombre: string } | undefined>,
  tipoCambio: number,
): LineaComprobante[] {
  const lineas: LineaComprobante[] = [];
  const detalle = `F.${gasto.numeroRespaldo ?? "S/N"} ${gasto.proveedorNombre.toUpperCase()} ${gasto.glosa.toUpperCase()}`.trim();
  const monto = Number(gasto.montoTotal);
  const cuenta = gasto.cuentaContableCaja;
  const subLinea =
    cuenta && (cuenta.requiereCentroCosto || cuenta.requiereFuncionGasto) && gasto.centroCostoCaja && gasto.funcionGastoCaja
      ? {
          centroCodigo: gasto.centroCostoCaja.codigo,
          centroNombre: gasto.centroCostoCaja.nombre,
          funcionCodigo: gasto.funcionGastoCaja.codigo,
          funcionNombre: gasto.funcionGastoCaja.nombre,
        }
      : {};

  if (gasto.tipoDocumento === "FACTURA") {
    const creditoFiscal = Number(gasto.montoCreditoFiscalIva);
    if (creditoFiscal > 0 && cuentaCreditoFiscal) {
      lineas.push({
        codigo: cuentaCreditoFiscal.codigo,
        cuentaNombre: cuentaCreditoFiscal.nombre,
        detalle,
        debeBs: creditoFiscal,
        haberBs: 0,
        debeUsd: creditoFiscal / tipoCambio,
        haberUsd: 0,
      });
    }
    if (cuenta) {
      lineas.push({
        codigo: cuenta.codigo,
        cuentaNombre: cuenta.nombre,
        detalle,
        debeBs: monto - creditoFiscal,
        haberBs: 0,
        debeUsd: (monto - creditoFiscal) / tipoCambio,
        haberUsd: 0,
        ...subLinea,
      });
    }
  } else if (gasto.tipoDocumento === "CONTRATO_RETENCION") {
    const retRcIva = Number(gasto.montoRetencionRcIva);
    const retIueCompras = Number(gasto.montoRetencionIueCompras);
    const retIt = Number(gasto.montoRetencionIt);
    const totalRetenciones = retRcIva + retIueCompras + retIt;

    if (cuenta) {
      lineas.push({
        codigo: cuenta.codigo,
        cuentaNombre: cuenta.nombre,
        detalle,
        debeBs: monto - totalRetenciones,
        haberBs: 0,
        debeUsd: (monto - totalRetenciones) / tipoCambio,
        haberUsd: 0,
        ...subLinea,
      });
    }

    const retenciones: Array<[number, string]> = [
      [retRcIva, "RC_IVA"],
      [retIueCompras, "IUE_COMPRAS"],
      [retIt, "IT"],
    ];
    for (const [montoRetencion, codigoConcepto] of retenciones) {
      const cuentaRetencion = cuentaPorRetencion[codigoConcepto];
      if (montoRetencion > 0 && cuentaRetencion) {
        lineas.push({
          codigo: cuentaRetencion.codigo,
          cuentaNombre: cuentaRetencion.nombre,
          detalle,
          debeBs: 0,
          haberBs: montoRetencion,
          debeUsd: 0,
          haberUsd: montoRetencion / tipoCambio,
        });
      }
    }
  } else if (cuenta) {
    // RECIBO / RECIBO_DIRECTO: sin créditos ni retenciones, 100% a la
    // cuenta contable resuelta (para RECIBO_DIRECTO suele ser Gastos No
    // Deducibles, pero eso lo decide la cuenta asignada al gasto, no
    // esta rama).
    lineas.push({
      codigo: cuenta.codigo,
      cuentaNombre: cuenta.nombre,
      detalle,
      debeBs: monto,
      haberBs: 0,
      debeUsd: monto / tipoCambio,
      haberUsd: 0,
    });
  }

  return lineas;
}

export const reportesCajaChicaService = {
  // Planilla de retenciones (RC-IVA / IUE Compras / IT) para declarar en el SIAT.
  async getRetenciones(query: ReporteCajaChicaQuery) {
    const where = { ...buildWhere(query), tipoDocumento: "CONTRATO_RETENCION" as const };

    const gastos = await prisma.gastoCaja.findMany({
      where,
      include: { caja: true },
      orderBy: { fecha: "asc" },
    });

    const totales = gastos.reduce(
      (acc, g) => ({
        rcIva: acc.rcIva + Number(g.montoRetencionRcIva),
        iueCompras: acc.iueCompras + Number(g.montoRetencionIueCompras),
        it: acc.it + Number(g.montoRetencionIt),
      }),
      { rcIva: 0, iueCompras: 0, it: 0 },
    );

    return { gastos, totales };
  },

  // Todos los gastos con tratamiento tributario (FACTURA, CONTRATO_RETENCION,
  // RECIBO, RECIBO_DIRECTO), con el desglose de impuesto que corresponde a
  // cada uno — a diferencia de getRetenciones() (solo CONTRATO_RETENCION,
  // pensado para declarar en el SIAT), este es el que responde "cuánto hay
  // que ir sacando de impuestos" mirando TODO lo registrado en el período:
  // crédito fiscal IVA a favor (FACTURA) + retenciones a pagar al SIN
  // (CONTRATO_RETENCION), agrupado por tipo de documento.
  async getImpuestos(query: ReporteCajaChicaQuery) {
    const where = buildWhere(query);

    const gastos = await prisma.gastoCaja.findMany({
      where,
      include: { caja: true },
      orderBy: [{ tipoDocumento: "asc" }, { fecha: "asc" }],
    });

    const porTipoDocumento = new Map<
      string,
      { tipoDocumento: string; cantidad: number; montoTotal: number; creditoFiscalIva: number; rcIva: number; iueCompras: number; it: number }
    >();

    for (const gasto of gastos) {
      const acumulado = porTipoDocumento.get(gasto.tipoDocumento) ?? {
        tipoDocumento: gasto.tipoDocumento,
        cantidad: 0,
        montoTotal: 0,
        creditoFiscalIva: 0,
        rcIva: 0,
        iueCompras: 0,
        it: 0,
      };
      acumulado.cantidad += 1;
      acumulado.montoTotal += Number(gasto.montoTotal);
      acumulado.creditoFiscalIva += Number(gasto.montoCreditoFiscalIva);
      acumulado.rcIva += Number(gasto.montoRetencionRcIva);
      acumulado.iueCompras += Number(gasto.montoRetencionIueCompras);
      acumulado.it += Number(gasto.montoRetencionIt);
      porTipoDocumento.set(gasto.tipoDocumento, acumulado);
    }

    const totales = gastos.reduce(
      (acc, g) => ({
        creditoFiscalIva: acc.creditoFiscalIva + Number(g.montoCreditoFiscalIva),
        rcIva: acc.rcIva + Number(g.montoRetencionRcIva),
        iueCompras: acc.iueCompras + Number(g.montoRetencionIueCompras),
        it: acc.it + Number(g.montoRetencionIt),
      }),
      { creditoFiscalIva: 0, rcIva: 0, iueCompras: 0, it: 0 },
    );

    return {
      gastos,
      porTipoDocumento: Array.from(porTipoDocumento.values()),
      totales: {
        ...totales,
        totalRetenciones: totales.rcIva + totales.iueCompras + totales.it,
      },
    };
  },

  // Gastos sin respaldo suficiente, para control y auditoría interna.
  async getNoDeducibles(query: ReporteCajaChicaQuery) {
    const where = { ...buildWhere(query), esNoDeducible: true };

    const gastos = await prisma.gastoCaja.findMany({
      where,
      include: { caja: true },
      orderBy: { fecha: "asc" },
    });

    const total = gastos.reduce((acc, g) => acc + Number(g.montoTotal), 0);

    return { gastos, total };
  },

  // Desglose de costos por centro operativo, función de gasto, cuenta
  // contable (a la que se termina imputando cada gasto) y categoría del
  // reporte mensual de rendición.
  async getDesglose(query: ReporteCajaChicaQuery) {
    const where = buildWhere(query);

    const gastos = await prisma.gastoCaja.findMany({
      where,
      include: { centroCostoCaja: true, funcionGastoCaja: true, cuentaContableCaja: true },
    });

    const porCentro = new Map<number, { centro: unknown; total: number }>();
    const porFuncion = new Map<number, { funcion: unknown; total: number }>();
    const porCuenta = new Map<number, { cuenta: unknown; total: number }>();
    const porCategoria = new Map<string, { categoria: string; total: number }>();
    // Separado por moneda porque sumar BOB y USD en un mismo total no tiene
    // sentido — es "cuánto gasté de banco y cuánto de caja" que pidió el
    // usuario, con la moneda de cada uno bien clara.
    const porOrigen = new Map<string, { origen: "CAJA" | "BANCO"; moneda: string; total: number; cantidad: number }>();

    for (const gasto of gastos) {
      const monto = Number(gasto.montoTotal);

      if (gasto.centroCostoCajaId) {
        const centro = porCentro.get(gasto.centroCostoCajaId) ?? { centro: gasto.centroCostoCaja, total: 0 };
        centro.total += monto;
        porCentro.set(gasto.centroCostoCajaId, centro);
      }

      if (gasto.funcionGastoCajaId) {
        const funcion = porFuncion.get(gasto.funcionGastoCajaId) ?? { funcion: gasto.funcionGastoCaja, total: 0 };
        funcion.total += monto;
        porFuncion.set(gasto.funcionGastoCajaId, funcion);
      }

      if (gasto.cuentaContableCajaId) {
        const cuenta = porCuenta.get(gasto.cuentaContableCajaId) ?? { cuenta: gasto.cuentaContableCaja, total: 0 };
        cuenta.total += monto;
        porCuenta.set(gasto.cuentaContableCajaId, cuenta);
      }

      const categoria = porCategoria.get(gasto.categoriaRendicion) ?? {
        categoria: CATEGORIA_LABEL[gasto.categoriaRendicion],
        total: 0,
      };
      categoria.total += monto;
      porCategoria.set(gasto.categoriaRendicion, categoria);

      const claveOrigen = `${gasto.origen}-${gasto.moneda}`;
      const origen = porOrigen.get(claveOrigen) ?? { origen: gasto.origen, moneda: gasto.moneda, total: 0, cantidad: 0 };
      origen.total += monto;
      origen.cantidad += 1;
      porOrigen.set(claveOrigen, origen);
    }

    return {
      porCentroCosto: Array.from(porCentro.values()),
      porFuncionGasto: Array.from(porFuncion.values()),
      porCuentaContable: Array.from(porCuenta.values()),
      porCategoria: Array.from(porCategoria.values()),
      porOrigen: Array.from(porOrigen.values()),
    };
  },

  // Estado de cuenta / libro de caja: saldo inicial (de la última rendición
  // CERRADA de la caja; si nunca se rindió, el saldo inicial que se declaró
  // al configurar la caja, no cero) + movimientos cronológicos (fondos
  // recibidos y gastos, sin anulados) con saldo corriente — la consulta
  // que faltaba para ver "cuánto hay en cada caja ahora mismo" sin tener
  // que crear una rendición.
  //
  // fechaInicio/fechaFin son opcionales: si se pasa fechaInicio, todo lo
  // anterior a esa fecha se acumula en "saldoInicial" (el saldo YA incluye
  // esos movimientos, no aparecen listados) — así el saldo de la primera
  // fila que se muestra siempre es el correcto, no arranca en 0 ni en el
  // saldo global de toda la vida de la caja.
  async getEstadoCuenta(cajaId: number, fechaInicio?: Date, fechaFin?: Date) {
    const caja = await prisma.cajaChica.findUnique({ where: { id: cajaId } });
    if (!caja) throw new HttpError("Caja chica no encontrada", 404);

    const ultimaCerrada = await prisma.rendicionCaja.findFirst({
      where: { cajaId, estado: "CERRADO" },
      orderBy: { periodoHasta: "desc" },
    });

    const saldoBase = ultimaCerrada ? Number(ultimaCerrada.saldoNuevo) : Number(caja.saldoInicial);
    const cortaDesde = ultimaCerrada ? ultimaCerrada.periodoHasta : undefined;

    const [fondos, movimientosBanco, gastos] = await Promise.all([
      prisma.movimientoFondoCaja.findMany({
        where: {
          cajaId,
          ...(cortaDesde ? { fecha: { gt: cortaDesde } } : {}),
          ...(fechaFin ? { fecha: { lte: fechaFin } } : {}),
        },
        orderBy: { fecha: "asc" },
      }),
      // Solo las SALIDAS del banco hacia esta caja cuentan como ingreso de
      // la caja — los INGRESO (dinero que llega al banco) todavía no están
      // en la caja física.
      prisma.movimientoBancoCaja.findMany({
        where: {
          cajaId,
          tipo: "SALIDA_A_CAJA",
          ...(cortaDesde ? { fecha: { gt: cortaDesde } } : {}),
          ...(fechaFin ? { fecha: { lte: fechaFin } } : {}),
        },
        include: { cuentaBancaria: true },
        orderBy: { fecha: "asc" },
      }),
      prisma.gastoCaja.findMany({
        where: {
          cajaId,
          estado: { not: "ANULADO" },
          ...(cortaDesde ? { fecha: { gt: cortaDesde } } : {}),
          ...(fechaFin ? { fecha: { lte: fechaFin } } : {}),
        },
        orderBy: { fecha: "asc" },
      }),
    ]);

    type Movimiento = {
      fecha: Date;
      tipo: "FONDO" | "GASTO";
      detalle: string;
      referencia: string | null;
      ingreso: number;
      egreso: number;
    };

    const movimientos: Movimiento[] = [
      ...fondos.map((f) => ({
        fecha: f.fecha,
        tipo: "FONDO" as const,
        detalle: f.tipo,
        referencia: f.referencia,
        ingreso: Number(f.monto),
        egreso: 0,
      })),
      ...movimientosBanco.map((m) => ({
        fecha: m.fecha,
        tipo: "FONDO" as const,
        detalle: `${m.cuentaBancaria.banco} · ${m.formaPago}`,
        referencia: m.numeroCheque ? `Cheque ${m.numeroCheque}` : m.descripcion,
        ingreso: Number(m.monto),
        egreso: 0,
      })),
      ...gastos.map((g) => ({
        fecha: g.fecha,
        tipo: "GASTO" as const,
        detalle: `${g.proveedorNombre} - ${g.glosa}`,
        referencia: g.numeroRespaldo,
        ingreso: 0,
        egreso: Number(g.montoTotal),
      })),
    ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    const antesDelRango = fechaInicio ? movimientos.filter((m) => m.fecha < fechaInicio) : [];
    const dentroDelRango = fechaInicio ? movimientos.filter((m) => m.fecha >= fechaInicio) : movimientos;

    let saldo = saldoBase;
    for (const m of antesDelRango) saldo = saldo + m.ingreso - m.egreso;
    const saldoInicial = saldo;

    const detalle = dentroDelRango.map((m) => {
      saldo = saldo + m.ingreso - m.egreso;
      return { ...m, saldo };
    });

    const totalIngresos = dentroDelRango.reduce((acc, m) => acc + m.ingreso, 0);
    const totalEgresos = dentroDelRango.reduce((acc, m) => acc + m.egreso, 0);

    return {
      caja,
      saldoInicial,
      fechaCorte: cortaDesde ?? null,
      fechaInicioPeriodo: fechaInicio ?? null,
      totalIngresos,
      totalEgresos,
      saldoActual: saldo,
      movimientos: detalle,
    };
  },

  // Mismo concepto que getEstadoCuenta() pero para una cuenta bancaria: no
  // existe una "rendición" que cierre una cuenta bancaria (esas solo cierran
  // cajas), así que el saldo inicial siempre es el declarado en Parámetros,
  // sin fecha de corte. Movimientos: INGRESO (dinero que llega al banco) y
  // SALIDA_A_CAJA (dinero que sale hacia una caja) de MovimientoBancoCaja,
  // más los gastos pagados directo desde esta cuenta (origen BANCO).
  async getEstadoCuentaBancaria(cuentaBancariaId: number, fechaInicio?: Date, fechaFin?: Date) {
    const cuenta = await prisma.cuentaBancariaCaja.findUnique({ where: { id: cuentaBancariaId } });
    if (!cuenta) throw new HttpError("Cuenta bancaria no encontrada", 404);

    const saldoBase = Number(cuenta.saldoInicial);

    const [movimientosBanco, gastosDirectos] = await Promise.all([
      prisma.movimientoBancoCaja.findMany({
        where: { cuentaBancariaId, ...(fechaFin ? { fecha: { lte: fechaFin } } : {}) },
        include: { caja: true },
        orderBy: { fecha: "asc" },
      }),
      prisma.gastoCaja.findMany({
        where: {
          cuentaBancariaCajaId: cuentaBancariaId,
          estado: { not: "ANULADO" },
          ...(fechaFin ? { fecha: { lte: fechaFin } } : {}),
        },
        orderBy: { fecha: "asc" },
      }),
    ]);

    type Movimiento = {
      fecha: Date;
      tipo: "FONDO" | "GASTO";
      detalle: string;
      referencia: string | null;
      ingreso: number;
      egreso: number;
    };

    const movimientos: Movimiento[] = [
      ...movimientosBanco.map((m) => ({
        fecha: m.fecha,
        tipo: "FONDO" as const,
        detalle:
          m.tipo === "INGRESO"
            ? `Ingreso · ${m.formaPago}`
            : `Salida hacia ${m.caja?.nombre ?? "caja"} · ${m.formaPago}`,
        referencia: m.numeroCheque ? `Cheque ${m.numeroCheque}` : m.descripcion,
        ingreso: m.tipo === "INGRESO" ? Number(m.monto) : 0,
        egreso: m.tipo === "SALIDA_A_CAJA" ? Number(m.monto) : 0,
      })),
      ...gastosDirectos.map((g) => ({
        fecha: g.fecha,
        tipo: "GASTO" as const,
        detalle: `${g.proveedorNombre} - ${g.glosa}`,
        referencia: g.numeroRespaldo,
        ingreso: 0,
        egreso: Number(g.montoTotal),
      })),
    ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    const antesDelRango = fechaInicio ? movimientos.filter((m) => m.fecha < fechaInicio) : [];
    const dentroDelRango = fechaInicio ? movimientos.filter((m) => m.fecha >= fechaInicio) : movimientos;

    let saldo = saldoBase;
    for (const m of antesDelRango) saldo = saldo + m.ingreso - m.egreso;
    const saldoInicial = saldo;

    const detalle = dentroDelRango.map((m) => {
      saldo = saldo + m.ingreso - m.egreso;
      return { ...m, saldo };
    });

    const totalIngresos = dentroDelRango.reduce((acc, m) => acc + m.ingreso, 0);
    const totalEgresos = dentroDelRango.reduce((acc, m) => acc + m.egreso, 0);

    return {
      cuenta,
      saldoInicial,
      fechaInicioPeriodo: fechaInicio ?? null,
      totalIngresos,
      totalEgresos,
      saldoActual: saldo,
      movimientos: detalle,
    };
  },

  // Reproduce el reporte mensual impreso real ("Caja Lipeña"): fondos
  // recibidos, detalle de gastos agrupado por categoría de rendición con
  // subtotales (en el orden exacto del documento), total de gastos y saldo
  // deudor/acreedor. Se genera a partir de una rendición ya creada (borrador
  // o cerrada), que es la que define el período y ya trae los gastos y
  // saldos calculados.
  async getReporteRendicion(rendicionId: string) {
    const rendicion = await prisma.rendicionCaja.findUnique({
      where: { id: rendicionId },
      include: { caja: true, detalleGastos: { include: { gasto: true } } },
    });
    if (!rendicion) throw new HttpError("Rendición no encontrada", 404);

    // El reporte mensual replica el documento físico de la caja: en "Fondos
    // Recibidos" solo van las remesas que entraron a la caja (CH-xxx), nunca
    // los movimientos del banco del módulo de presupuesto — esos se ven en
    // los reportes del banco, no en la rendición de la caja.
    const fondosCaja = await prisma.movimientoFondoCaja.findMany({
      where: { cajaId: rendicion.cajaId, fecha: { gte: rendicion.periodoDesde, lte: rendicion.periodoHasta } },
      orderBy: { fecha: "asc" },
    });

    const fondos = fondosCaja.map((f) => ({
      id: f.id,
      tipo: f.tipo as string,
      monto: f.monto,
      moneda: f.moneda,
      fecha: f.fecha,
      referencia: f.referencia,
    }));

    const gastosDeRendicion = rendicion.detalleGastos
      .map((d) => d.gasto)
      .filter((g) => g.estado !== "ANULADO");

    // Todas las categorías, aunque estén vacías (el documento real siempre
    // muestra "ACTIVOS FIJOS" y "MEDIO AMBIENTE" con sub-total 0,00).
    const grupos = CATEGORIA_ORDEN.map((categoria) => {
      const gastos = gastosDeRendicion
        .filter((g) => g.categoriaRendicion === categoria)
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
      const subtotal = gastos.reduce((acc, g) => acc + Number(g.montoTotal), 0);
      return { categoria, label: CATEGORIA_LABEL[categoria], gastos, subtotal };
    });

    const totalFondos = fondos.reduce((acc, f) => acc + Number(f.monto), 0);
    const totalGastos = grupos.reduce((acc, g) => acc + g.subtotal, 0);

    return {
      caja: rendicion.caja,
      numero: rendicion.numero,
      periodoDesde: rendicion.periodoDesde,
      periodoHasta: rendicion.periodoHasta,
      tipoCambio: Number(rendicion.tipoCambio),
      fondos,
      totalFondos,
      grupos,
      totalGastos,
      saldoAnterior: Number(rendicion.saldoAnterior),
      saldoNuevo: Number(rendicion.saldoNuevo),
    };
  },

  // Comprobante de Diario: el asiento contable de partida doble (Bs./$us.)
  // de una rendición ya cerrada, mismo formato del comprobante real
  // ("No: P-N/AAAA", cabecera, tabla CODIGO/DETALLE/BOLIVIANOS/DOLARES).
  //
  // Regla de asiento por gasto (documentada porque no es obvia):
  // - FACTURA: 2 líneas, ambas al DEBE — Crédito Fiscal (69.001.000) por el
  //   monto ya calculado por el motor tributario, y el resto a la cuenta
  //   contable que el sistema resolvió para ese gasto (Costo de Producción,
  //   Gastos Administrativos, etc., con su centro de costo/función de gasto
  //   como sub-línea) — es la lectura más defendible de los ejemplos reales:
  //   ahí cada factura de combustible aparece partida en Crédito Fiscal +
  //   una segunda cuenta por el resto. (El PDF real usa a veces una cuenta
  //   puente "Compensación" para reclasificar después a mano; este sistema
  //   no modela ese paso manual, así que postea directo a la cuenta ya
  //   resuelta — avisar si de verdad se necesita el paso de compensación.)
  // - CONTRATO_RETENCION: el líquido pagado (monto - retenciones) al DEBE de
  //   la cuenta resuelta, y cada retención (RC-IVA/IUE/IT) al HABER de su
  //   cuenta de retención — es lo que se le retiene al proveedor.
  // - RECIBO_DIRECTO: el monto completo al DEBE de Gastos No Deducibles.
  async getComprobanteDiario(rendicionId: string) {
    const rendicion = await prisma.rendicionCaja.findUnique({
      where: { id: rendicionId },
      include: {
        caja: true,
        detalleGastos: {
          include: { gasto: { include: { centroCostoCaja: true, funcionGastoCaja: true, cuentaContableCaja: true } } },
        },
      },
    });
    if (!rendicion) throw new HttpError("Rendición no encontrada", 404);

    const { cuentaCreditoFiscal, cuentaPorRetencion } = await obtenerCuentasMotorTributario();
    const tipoCambio = Number(rendicion.tipoCambio);

    const gastos = rendicion.detalleGastos
      .map((d) => d.gasto)
      .filter((g) => g.estado !== "ANULADO")
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    const lineas = gastos.flatMap((gasto) =>
      construirLineasGasto(gasto, cuentaCreditoFiscal, cuentaPorRetencion, tipoCambio),
    );

    const totales = lineas.reduce(
      (acc, l) => ({
        debeBs: acc.debeBs + l.debeBs,
        haberBs: acc.haberBs + l.haberBs,
        debeUsd: acc.debeUsd + l.debeUsd,
        haberUsd: acc.haberUsd + l.haberUsd,
      }),
      { debeBs: 0, haberBs: 0, debeUsd: 0, haberUsd: 0 },
    );

    return {
      caja: rendicion.caja,
      numero: rendicion.numero,
      periodoDesde: rendicion.periodoDesde,
      periodoHasta: rendicion.periodoHasta,
      tipoCambio,
      lineas,
      totales,
    };
  },

  // Comprobante de Egresos de UN gasto puntual pagado desde banco (el
  // documento físico real "Bancos - Moneda Nacional"): mismas líneas que ya
  // arma construirLineasGasto(), más la línea final que le faltaba al
  // Comprobante Diario — el HABER a la cuenta contable del banco de donde
  // salió la plata, balanceando el total. El folio se asigna recién la
  // primera vez que se pide este comprobante, y queda fijo desde entonces.
  async getComprobanteEgresoGasto(gastoId: string, userId: number) {
    return prisma.$transaction(async (tx) => {
      const gasto = await tx.gastoCaja.findUnique({
        where: { id: gastoId },
        include: {
          centroCostoCaja: true,
          funcionGastoCaja: true,
          cuentaContableCaja: true,
          cuentaBancariaCaja: { include: { cuentaContableCaja: true } },
          rendicionDetalle: { include: { rendicion: true } },
        },
      });
      if (!gasto) throw new HttpError("Gasto no encontrado", 404);
      if (gasto.origen !== "BANCO") {
        throw new HttpError("El Comprobante de Egresos solo aplica a gastos pagados desde una cuenta bancaria", 400);
      }
      if (gasto.estado === "ANULADO") {
        throw new HttpError("No se puede generar el comprobante de un gasto anulado", 409);
      }
      if (!gasto.cuentaBancariaCaja) {
        throw new HttpError("Este gasto no tiene una cuenta bancaria asociada", 409);
      }

      let numeroComprobante = gasto.numeroComprobante;
      if (!numeroComprobante) {
        numeroComprobante = await generarNumeroComprobanteEgresoGasto(tx);
        await tx.gastoCaja.update({ where: { id: gastoId }, data: { numeroComprobante } });
        await tx.log.create({
          data: {
            usuarioId: userId,
            accion: "ASIGNAR_NUMERO_COMPROBANTE_EGRESO",
            data: { gastoId, numeroComprobante },
          },
        });
      }

      const { cuentaCreditoFiscal, cuentaPorRetencion } = await obtenerCuentasMotorTributario();
      const tipoCambio = gasto.rendicionDetalle[0]?.rendicion
        ? Number(gasto.rendicionDetalle[0].rendicion.tipoCambio)
        : TIPO_CAMBIO_BOB_USD_DEFAULT;

      const lineas = construirLineasGasto(gasto, cuentaCreditoFiscal, cuentaPorRetencion, tipoCambio);

      const monto = Number(gasto.montoTotal);
      const cuentaBanco = gasto.cuentaBancariaCaja.cuentaContableCaja;
      lineas.push({
        codigo: cuentaBanco?.codigo ?? "",
        cuentaNombre: cuentaBanco?.nombre ?? `${gasto.cuentaBancariaCaja.banco} - ${gasto.cuentaBancariaCaja.nombreCuenta}`,
        detalle: `F.${gasto.numeroRespaldo ?? "S/N"} ${gasto.proveedorNombre.toUpperCase()} ${gasto.glosa.toUpperCase()}`.trim(),
        debeBs: 0,
        haberBs: monto,
        debeUsd: 0,
        haberUsd: monto / tipoCambio,
      });

      const totales = lineas.reduce(
        (acc, l) => ({
          debeBs: acc.debeBs + l.debeBs,
          haberBs: acc.haberBs + l.haberBs,
          debeUsd: acc.debeUsd + l.debeUsd,
          haberUsd: acc.haberUsd + l.haberUsd,
        }),
        { debeBs: 0, haberBs: 0, debeUsd: 0, haberUsd: 0 },
      );

      return {
        numero: numeroComprobante,
        fecha: gasto.fecha,
        proveedorNombre: gasto.proveedorNombre,
        glosa: gasto.glosa,
        numeroRespaldo: gasto.numeroRespaldo,
        montoTotal: monto,
        moneda: gasto.moneda,
        cuentaBancaria: { banco: gasto.cuentaBancariaCaja.banco, nombreCuenta: gasto.cuentaBancariaCaja.nombreCuenta },
        tipoCambio,
        lineas,
        totales,
      };
    });
  },
};
