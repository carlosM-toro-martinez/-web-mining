import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../errors/http.error.js";
import { assertMesSinCppMovil, esMesCppMovil } from "../../utils/cppMovil.js";

type Db = typeof prisma | Prisma.TransactionClient;
const Dec = Prisma.Decimal;

export type MovimientoOrdenable = {
  id: string;
  tipo: "ENTRADA" | "SALIDA";
  referencia: string | null;
  referenciaId: string | null;
  createdAt: Date;
};

// Los movimientos retroactivos guardan solo la fecha (00:00). Para ordenar los de un mismo día se usa
// el momento en que se registró la operación: el vale o la compra que los originó.
export async function momentosDeRegistro(db: Db, movs: MovimientoOrdenable[]): Promise<Map<string, number>> {
  const valeIds = new Set<string>();
  const compraIds = new Set<string>();
  for (const m of movs) {
    if (!m.referenciaId) continue;
    if (m.referencia === "VALE") valeIds.add(m.referenciaId);
    else if (m.referencia === "COMPRA") compraIds.add(m.referenciaId);
  }
  const [vales, compras] = await Promise.all([
    valeIds.size ? db.vale.findMany({ where: { id: { in: [...valeIds] } }, select: { id: true, createdAt: true } }) : [],
    compraIds.size ? db.compra.findMany({ where: { id: { in: [...compraIds] } }, select: { id: true, createdAt: true, recibidoAt: true } }) : [],
  ]);
  const valeAt = new Map(vales.map((v) => [v.id, v.createdAt.getTime()]));
  const compraAt = new Map(compras.map((c) => [c.id, (c.recibidoAt ?? c.createdAt).getTime()]));

  const out = new Map<string, number>();
  for (const m of movs) {
    let t = m.createdAt.getTime();
    if (m.referenciaId) {
      if (m.referencia === "VALE") t = valeAt.get(m.referenciaId) ?? t;
      else if (m.referencia === "COMPRA") t = compraAt.get(m.referenciaId) ?? t;
    }
    out.set(m.id, t);
  }
  return out;
}

export function ordenarMovimientos<T extends MovimientoOrdenable>(movs: T[], registro: Map<string, number>): T[] {
  return [...movs].sort((a, b) => {
    const d = a.createdAt.getTime() - b.createdAt.getTime();
    if (d !== 0) return d;
    const r = (registro.get(a.id) ?? 0) - (registro.get(b.id) ?? 0);
    if (r !== 0) return r;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

const inicioMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes - 1, 1));
const finMes = (anio: number, mes: number) => new Date(Date.UTC(mes === 12 ? anio + 1 : anio, mes === 12 ? 0 : mes, 1));

// Los SALDO_INICIAL son la carga del stock de apertura: ya están dentro del saldo inicial del mes y el reporte los oculta.
function filtroMovimientosDelMes(anio: number, mes: number) {
  return {
    AND: [
      {
        OR: [
          { esRetroactivo: true, periodoAnio: anio, periodoMes: mes },
          { esRetroactivo: false, createdAt: { gte: inicioMes(anio, mes), lt: finMes(anio, mes) } },
        ],
      },
      { OR: [{ referencia: null }, { referencia: { not: "SALDO_INICIAL" } }] },
    ],
  };
}

type MovCadena = MovimientoOrdenable & {
  cantidad: Prisma.Decimal;
  precioUnit: Prisma.Decimal;
  stockAntes: Prisma.Decimal;
  stockDespues: Prisma.Decimal;
  saldoBs: Prisma.Decimal;
};

type FilaCadena = { mov: MovCadena; antes: Prisma.Decimal; despues: Prisma.Decimal; saldoBs: Prisma.Decimal; cambia: boolean };

// Cálculo puro: un solo orden cronológico, partiendo del saldo inicial del mes.
function calcularCadena(movs: MovCadena[], registro: Map<string, number>, saldoInicial: Prisma.Decimal, saldoFinal: Prisma.Decimal) {
  let corriente = new Dec(saldoInicial);
  const filas: FilaCadena[] = [];
  for (const m of ordenarMovimientos(movs, registro)) {
    const cantidad = new Dec(m.cantidad);
    const antes = corriente;
    corriente = m.tipo === "ENTRADA" ? corriente.add(cantidad) : corriente.sub(cantidad);
    const saldoBs = corriente.isNegative() ? new Dec(0) : corriente.mul(m.precioUnit).toDecimalPlaces(2, Dec.ROUND_HALF_UP);
    const cambia = !antes.eq(m.stockAntes) || !corriente.eq(m.stockDespues) || !saldoBs.eq(m.saldoBs);
    filas.push({ mov: m, antes, despues: corriente, saldoBs, cambia });
  }
  return { filas, saldoFinalCadena: corriente, cuadra: corriente.eq(saldoFinal) };
}

const SELECT_CADENA = {
  id: true, productoId: true, tipo: true, cantidad: true, precioUnit: true, referencia: true, referenciaId: true,
  createdAt: true, stockAntes: true, stockDespues: true, saldoBs: true,
} as const;

export type CambioFila = {
  fecha: Date;
  tipo: string;
  referencia: string | null;
  cantidad: string;
  stockAntes: { antes: string; despues: string };
  stockDespues: { antes: string; despues: string };
};

export type ResultadoCadenaProducto = {
  productoId: number;
  codigo: string;
  movimientos: number;
  filasModificadas: number;
  saldoInicial: string;
  saldoFinalCadena: string;
  saldoFinalMes: string;
  cuadra: boolean;
  aplicado: boolean;
  motivo?: string;
  cambios: CambioFila[];
};

// Rehace stockAntes / stockDespues / saldoBs de TODOS los movimientos del producto en el mes, en un solo orden
// cronológico y partiendo del saldo inicial del mes. No toca precios, importes, SaldoMensual ni Stock.
export async function reconstruirCadenaProductoMes(
  db: Db,
  productoId: number,
  anio: number,
  mes: number,
  aplicar: boolean,
  maxCambios = 0,
): Promise<ResultadoCadenaProducto> {
  const producto = await db.producto.findUnique({ where: { id: productoId }, select: { codigo: true } });
  const base = { productoId, codigo: producto?.codigo ?? String(productoId), movimientos: 0, filasModificadas: 0, saldoInicial: "0", saldoFinalCadena: "0", saldoFinalMes: "0", cuadra: false, aplicado: false, cambios: [] as CambioFila[] };

  const saldo = await db.saldoMensual.findUnique({
    where: { productoId_anio_mes: { productoId, anio, mes } },
    select: { saldoInicial: true, saldoFinal: true },
  });
  if (!saldo) return { ...base, motivo: "El producto no tiene saldo mensual en este mes" };

  const movs = await db.movimiento.findMany({ where: { productoId, ...filtroMovimientosDelMes(anio, mes) }, select: SELECT_CADENA });
  const registro = await momentosDeRegistro(db, movs);
  const { filas, saldoFinalCadena, cuadra } = calcularCadena(movs, registro, saldo.saldoInicial, saldo.saldoFinal);

  const modificadas = filas.filter((f) => f.cambia);
  const cambios: CambioFila[] = modificadas.slice(0, maxCambios).map((f) => ({
    fecha: f.mov.createdAt,
    tipo: f.mov.tipo,
    referencia: f.mov.referencia,
    cantidad: new Dec(f.mov.cantidad).toString(),
    stockAntes: { antes: new Dec(f.mov.stockAntes).toString(), despues: f.antes.toString() },
    stockDespues: { antes: new Dec(f.mov.stockDespues).toString(), despues: f.despues.toString() },
  }));

  const resultado: ResultadoCadenaProducto = {
    ...base,
    movimientos: filas.length,
    filasModificadas: modificadas.length,
    saldoInicial: new Dec(saldo.saldoInicial).toString(),
    saldoFinalCadena: saldoFinalCadena.toString(),
    saldoFinalMes: new Dec(saldo.saldoFinal).toString(),
    cuadra,
    cambios,
  };
  if (!cuadra) return { ...resultado, motivo: "Los movimientos no suman el saldo final del mes; no se modifica" };
  if (!aplicar || modificadas.length === 0) return resultado;

  const updates = modificadas.map((f) =>
    db.movimiento.update({ where: { id: f.mov.id }, data: { stockAntes: f.antes, stockDespues: f.despues, saldoBs: f.saldoBs } }),
  );
  if ("$transaction" in db) await db.$transaction(updates);
  else for (const u of updates) await u;
  return { ...resultado, aplicado: true };
}

export async function productosConMovimientosEnMes(db: Db, anio: number, mes: number): Promise<number[]> {
  const filas = await db.movimiento.findMany({
    where: filtroMovimientosDelMes(anio, mes),
    select: { productoId: true },
    distinct: ["productoId"],
  });
  return filas.map((f) => f.productoId).sort((a, b) => a - b);
}

export async function reconstruirCadenaMes(input: { anio: number; mes: number; productoId?: number; aplicar: boolean }) {
  const { anio, mes, aplicar } = input;
  const cerrado = await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } }, select: { id: true } });
  if (cerrado) throw new HttpError(`El período ${mes}/${anio} está cerrado: no se modifica`, 409);
  assertMesSinCppMovil(anio, mes, "Reconstruir la cadena del bin-card");

  const productoIds = input.productoId ? [input.productoId] : await productosConMovimientosEnMes(prisma, anio, mes);
  const resultados: ResultadoCadenaProducto[] = [];
  const errores: Array<{ productoId: number; error: string }> = [];
  for (const productoId of productoIds) {
    try {
      resultados.push(await reconstruirCadenaProductoMes(prisma, productoId, anio, mes, aplicar, 6));
    } catch (err) {
      errores.push({ productoId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const conCambios = resultados.filter((r) => r.filasModificadas > 0);
  const omitidos = resultados.filter((r) => !r.cuadra);
  return {
    anio,
    mes,
    aplicar,
    productosAnalizados: resultados.length,
    productosConCambios: conCambios.length,
    filasModificadas: conCambios.reduce((a, r) => a + r.filasModificadas, 0),
    productosAplicados: resultados.filter((r) => r.aplicado).length,
    productosOmitidos: omitidos.map((r) => ({ codigo: r.codigo, motivo: r.motivo ?? "", saldoFinalCadena: r.saldoFinalCadena, saldoFinalMes: r.saldoFinalMes })),
    muestra: conCambios.slice(0, 12).map((r) => ({ codigo: r.codigo, filasModificadas: r.filasModificadas, cambios: r.cambios })),
    errores,
  };
}

// ─── Vista simulada para el reporte: nunca escribe en la base ───────────────────────────────────

export type FilaSimulada = { stockAntes: number; stockDespues: number; saldoBs: number };

type MovReporte = { id: string; productoId: number; esRetroactivo: boolean; periodoAnio: number | null; periodoMes: number | null; createdAt: Date; referencia: string | null };

// Devuelve, por id de movimiento, el stock antes/después y el saldo Bs que tendría en una cadena cronológica
// del mes. No toca los meses con CPP móvil (su cadena guardada ya es la correcta) ni los productos cuyos
// movimientos no suman el saldo del mes: esos se muestran como están.
export async function simularCadenasReporte(db: Db, rows: MovReporte[]) {
  const porMes = new Map<string, { anio: number; mes: number; productos: Set<number> }>();
  for (const r of rows) {
    if (r.referencia === "SALDO_INICIAL") continue;
    const anio = r.esRetroactivo && r.periodoAnio ? r.periodoAnio : r.createdAt.getUTCFullYear();
    const mes = r.esRetroactivo && r.periodoMes ? r.periodoMes : r.createdAt.getUTCMonth() + 1;
    if (esMesCppMovil(anio, mes)) continue;
    const clave = `${anio}-${mes}`;
    const g = porMes.get(clave) ?? { anio, mes, productos: new Set<number>() };
    g.productos.add(r.productoId);
    porMes.set(clave, g);
  }

  const filas = new Map<string, FilaSimulada>();
  const sinSimular: Array<{ productoId: number; anio: number; mes: number; motivo: string }> = [];

  for (const { anio, mes, productos } of porMes.values()) {
    const ids = [...productos];
    const [saldos, movs] = await Promise.all([
      db.saldoMensual.findMany({ where: { anio, mes, productoId: { in: ids } }, select: { productoId: true, saldoInicial: true, saldoFinal: true } }),
      db.movimiento.findMany({ where: { productoId: { in: ids }, ...filtroMovimientosDelMes(anio, mes) }, select: SELECT_CADENA }),
    ]);
    const saldoPorProducto = new Map(saldos.map((s) => [s.productoId, s]));
    const registro = await momentosDeRegistro(db, movs);
    const movsPorProducto = new Map<number, typeof movs>();
    for (const m of movs) movsPorProducto.set(m.productoId, [...(movsPorProducto.get(m.productoId) ?? []), m]);

    for (const productoId of ids) {
      const saldo = saldoPorProducto.get(productoId);
      if (!saldo) { sinSimular.push({ productoId, anio, mes, motivo: "sin saldo mensual" }); continue; }
      const { filas: cadena, cuadra } = calcularCadena(movsPorProducto.get(productoId) ?? [], registro, saldo.saldoInicial, saldo.saldoFinal);
      if (!cuadra) { sinSimular.push({ productoId, anio, mes, motivo: "los movimientos no suman el saldo del mes" }); continue; }
      for (const f of cadena) filas.set(f.mov.id, { stockAntes: f.antes.toNumber(), stockDespues: f.despues.toNumber(), saldoBs: f.saldoBs.toNumber() });
    }
  }
  return { filas, sinSimular };
}
