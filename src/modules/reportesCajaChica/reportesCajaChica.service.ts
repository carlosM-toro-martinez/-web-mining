import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../errors/http.error.js";
import type { ReporteCajaChicaQuery } from "./reportesCajaChica.types.js";

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

    for (const gasto of gastos) {
      const monto = Number(gasto.montoTotal);

      const centro = porCentro.get(gasto.centroCostoCajaId) ?? { centro: gasto.centroCostoCaja, total: 0 };
      centro.total += monto;
      porCentro.set(gasto.centroCostoCajaId, centro);

      const funcion = porFuncion.get(gasto.funcionGastoCajaId) ?? { funcion: gasto.funcionGastoCaja, total: 0 };
      funcion.total += monto;
      porFuncion.set(gasto.funcionGastoCajaId, funcion);

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
    }

    return {
      porCentroCosto: Array.from(porCentro.values()),
      porFuncionGasto: Array.from(porFuncion.values()),
      porCuentaContable: Array.from(porCuenta.values()),
      porCategoria: Array.from(porCategoria.values()),
    };
  },

  // Estado de cuenta / libro de caja: saldo inicial (de la última rendición
  // CERRADA de la caja, 0 si nunca se rindió) + movimientos cronológicos
  // (fondos recibidos y gastos, sin anulados) con saldo corriente — la
  // consulta que faltaba para ver "cuánto hay en cada caja ahora mismo"
  // sin tener que crear una rendición.
  async getEstadoCuenta(cajaId: number) {
    const caja = await prisma.cajaChica.findUnique({ where: { id: cajaId } });
    if (!caja) throw new HttpError("Caja chica no encontrada", 404);

    const ultimaCerrada = await prisma.rendicionCaja.findFirst({
      where: { cajaId, estado: "CERRADO" },
      orderBy: { periodoHasta: "desc" },
    });

    const saldoInicial = ultimaCerrada ? Number(ultimaCerrada.saldoNuevo) : 0;
    const cortaDesde = ultimaCerrada ? ultimaCerrada.periodoHasta : undefined;

    const [fondos, gastos] = await Promise.all([
      prisma.movimientoFondoCaja.findMany({
        where: { cajaId, ...(cortaDesde ? { fecha: { gt: cortaDesde } } : {}) },
        orderBy: { fecha: "asc" },
      }),
      prisma.gastoCaja.findMany({
        where: {
          cajaId,
          estado: { not: "ANULADO" },
          ...(cortaDesde ? { fecha: { gt: cortaDesde } } : {}),
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
      ...gastos.map((g) => ({
        fecha: g.fecha,
        tipo: "GASTO" as const,
        detalle: `${g.proveedorNombre} - ${g.glosa}`,
        referencia: g.numeroRespaldo,
        ingreso: 0,
        egreso: Number(g.montoTotal),
      })),
    ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    let saldo = saldoInicial;
    const detalle = movimientos.map((m) => {
      saldo = saldo + m.ingreso - m.egreso;
      return { ...m, saldo };
    });

    const totalIngresos = movimientos.reduce((acc, m) => acc + m.ingreso, 0);
    const totalEgresos = movimientos.reduce((acc, m) => acc + m.egreso, 0);

    return {
      caja,
      saldoInicial,
      fechaCorte: cortaDesde ?? null,
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

    const fondos = await prisma.movimientoFondoCaja.findMany({
      where: { cajaId: rendicion.cajaId, fecha: { gte: rendicion.periodoDesde, lte: rendicion.periodoHasta } },
      orderBy: { fecha: "asc" },
    });

    const gastosDeRendicion = rendicion.detalleGastos
      .map((d) => d.gasto)
      .filter((g) => g.estado !== "ANULADO");

    const grupos = CATEGORIA_ORDEN.map((categoria) => {
      const gastos = gastosDeRendicion
        .filter((g) => g.categoriaRendicion === categoria)
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
      const subtotal = gastos.reduce((acc, g) => acc + Number(g.montoTotal), 0);
      return { categoria, label: CATEGORIA_LABEL[categoria], gastos, subtotal };
    }).filter((grupo) => grupo.gastos.length > 0);

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

    const [cuentaCreditoFiscal, conceptosRetencion] = await Promise.all([
      prisma.cuentaContableCaja.findUnique({ where: { codigo: "69.001.000" } }),
      prisma.conceptoRetencionCaja.findMany({ include: { cuentaContableCaja: true } }),
    ]);
    const cuentaPorRetencion: Record<string, { codigo: string; nombre: string } | undefined> = {
      RC_IVA: conceptosRetencion.find((c) => c.codigo === "RC_IVA")?.cuentaContableCaja,
      IUE_COMPRAS: conceptosRetencion.find((c) => c.codigo === "IUE_COMPRAS")?.cuentaContableCaja,
      IT: conceptosRetencion.find((c) => c.codigo === "IT")?.cuentaContableCaja,
    };

    const tipoCambio = Number(rendicion.tipoCambio);
    type LineaComprobante = {
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
    const lineas: LineaComprobante[] = [];

    const gastos = rendicion.detalleGastos
      .map((d) => d.gasto)
      .filter((g) => g.estado !== "ANULADO")
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    for (const gasto of gastos) {
      const detalle = `F.${gasto.numeroRespaldo ?? "S/N"} ${gasto.proveedorNombre.toUpperCase()} ${gasto.glosa.toUpperCase()}`.trim();
      const monto = Number(gasto.montoTotal);
      const cuenta = gasto.cuentaContableCaja;
      const subLinea =
        cuenta && (cuenta.requiereCentroCosto || cuenta.requiereFuncionGasto)
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
        // RECIBO_DIRECTO: 100% a Gastos No Deducibles.
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
    }

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
};
