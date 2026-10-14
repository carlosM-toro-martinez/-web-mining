import { prisma } from "../../config/prisma.js";

const DIA_MS = 24 * 60 * 60 * 1000;
const norm = (s: string | null | undefined) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");

export interface ItemDuplicado {
  id: string;
  fecha: Date;
  monto: number;
  moneda: string;
  detalle: string;
  donde: string;
  referencia: string | null;
}

export interface GrupoDuplicado {
  nivel: "ALTA" | "MEDIA";
  motivo: string;
  items: ItemDuplicado[];
}

// Agrupa por clave y, dentro de cada clave, junta los que están a ≤ maxDias
// uno del siguiente (cadena: A–B a 2 días y B–C a 2 días quedan juntos).
function agruparCercanos<T extends { fecha: Date }>(items: T[], clave: (i: T) => string | null, maxDias: number) {
  const porClave = new Map<string, T[]>();
  for (const i of items) {
    const k = clave(i);
    if (!k) continue;
    porClave.set(k, [...(porClave.get(k) ?? []), i]);
  }
  const grupos: T[][] = [];
  for (const lista of porClave.values()) {
    if (lista.length < 2) continue;
    lista.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    let actual: T[] = [lista[0]!];
    for (const i of lista.slice(1)) {
      if (i.fecha.getTime() - actual[actual.length - 1]!.fecha.getTime() <= maxDias * DIA_MS) actual.push(i);
      else {
        if (actual.length > 1) grupos.push(actual);
        actual = [i];
      }
    }
    if (actual.length > 1) grupos.push(actual);
  }
  return grupos;
}

export async function getPosiblesDuplicados(query: {
  cajaId?: number | undefined;
  fechaInicio?: Date | undefined;
  fechaFin?: Date | undefined;
}) {
  const rango =
    query.fechaInicio || query.fechaFin
      ? { fecha: { ...(query.fechaInicio ? { gte: query.fechaInicio } : {}), ...(query.fechaFin ? { lte: query.fechaFin } : {}) } }
      : {};

  const [gastos, fondos, ingresos] = await Promise.all([
    prisma.gastoCaja.findMany({
      where: { estado: { not: "ANULADO" }, ...(query.cajaId ? { cajaId: query.cajaId } : {}), ...rango },
      include: { caja: true, cuentaBancariaCaja: true },
    }),
    prisma.movimientoFondoCaja.findMany({
      where: { ...(query.cajaId ? { cajaId: query.cajaId } : {}), ...rango },
      include: { caja: true },
    }),
    query.cajaId
      ? Promise.resolve([])
      : prisma.movimientoBancoCaja.findMany({ where: { tipo: "INGRESO", ...rango }, include: { cuentaBancaria: true } }),
  ]);

  const itemGasto = (g: (typeof gastos)[number]): ItemDuplicado => ({
    id: g.id,
    fecha: g.fecha,
    monto: Number(g.montoTotal),
    moneda: g.moneda,
    detalle: `${g.proveedorNombre} — ${g.glosa}`,
    donde: g.origen === "CAJA" ? (g.caja?.nombre ?? "Caja") : `Banco ${g.cuentaBancariaCaja?.nombreCuenta ?? ""}`.trim(),
    referencia: g.numeroRespaldo,
  });

  // Solo un N° de verdad: textos de relleno ("0", "FORMULARIO", "S/N") no cuentan.
  const numeroReal = (n: string | null) => {
    const v = norm(n);
    return /\d/.test(v) && !/^0+$/.test(v) ? v : null;
  };
  const proveedorDe = (g: (typeof gastos)[number]) => norm(g.proveedorNitCi) || norm(g.proveedorNombre);
  const SIEMPRE = 36500;

  // ALTA: mismo comprobante, mismo proveedor y mismo monto.
  const mismoComprobanteYMonto = agruparCercanos(
    gastos,
    (g) => (numeroReal(g.numeroRespaldo) ? `${numeroReal(g.numeroRespaldo)}|${proveedorDe(g)}|${Number(g.montoTotal).toFixed(2)}` : null),
    SIEMPRE,
  );
  let yaAgrupados = new Set(mismoComprobanteYMonto.flat().map((g) => g.id));

  // MEDIA: mismo comprobante y proveedor, pero con montos distintos.
  const mismoComprobante = agruparCercanos(
    gastos.filter((g) => !yaAgrupados.has(g.id)),
    (g) => (numeroReal(g.numeroRespaldo) ? `${numeroReal(g.numeroRespaldo)}|${proveedorDe(g)}` : null),
    SIEMPRE,
  );
  yaAgrupados = new Set([...yaAgrupados, ...mismoComprobante.flat().map((g) => g.id)]);

  // MEDIA: mismo proveedor y mismo monto en pocos días.
  const mismoMonto = agruparCercanos(
    gastos.filter((g) => !yaAgrupados.has(g.id)),
    (g) => `${norm(g.proveedorNombre)}|${Number(g.montoTotal).toFixed(2)}`,
    3,
  );

  const gruposGastos: GrupoDuplicado[] = [
    ...mismoComprobanteYMonto.map((grupo) => ({
      nivel: "ALTA" as const,
      motivo: `La misma factura/recibo N° ${grupo[0]!.numeroRespaldo}, del mismo proveedor y por el mismo monto, está registrada ${grupo.length} veces`,
      items: grupo.map(itemGasto),
    })),
    ...mismoComprobante.map((grupo) => ({
      nivel: "MEDIA" as const,
      motivo: `El N° de comprobante ${grupo[0]!.numeroRespaldo} del mismo proveedor aparece ${grupo.length} veces con montos distintos`,
      items: grupo.map(itemGasto),
    })),
    ...mismoMonto.map((grupo) => ({
      nivel: "MEDIA" as const,
      motivo: `Mismo proveedor y mismo monto en ${grupo.length} gastos con 3 días o menos de diferencia`,
      items: grupo.map(itemGasto),
    })),
  ];

  const gruposEntradas: GrupoDuplicado[] = [
    ...agruparCercanos(fondos, (f) => `${f.cajaId}|${Number(f.monto).toFixed(2)}`, 3).map((grupo) => ({
      nivel: "MEDIA" as const,
      motivo: `Mismo monto entrado ${grupo.length} veces a la caja con 3 días o menos de diferencia`,
      items: grupo.map(
        (f): ItemDuplicado => ({
          id: f.id,
          fecha: f.fecha,
          monto: Number(f.monto),
          moneda: f.moneda,
          detalle: `Fondo a caja (${f.tipo})`,
          donde: f.caja.nombre,
          referencia: f.referencia,
        }),
      ),
    })),
    ...agruparCercanos(ingresos, (m) => `${m.cuentaBancariaId}|${Number(m.monto).toFixed(2)}`, 5).map((grupo) => ({
      nivel: "MEDIA" as const,
      motivo: `Mismo monto ingresado ${grupo.length} veces a la cuenta bancaria con 5 días o menos de diferencia`,
      items: grupo.map(
        (m): ItemDuplicado => ({
          id: m.id,
          fecha: m.fecha,
          monto: Number(m.monto),
          moneda: m.moneda,
          detalle: m.descripcion,
          donde: `Banco ${m.cuentaBancaria.nombreCuenta}`,
          referencia: m.depositanteNombre,
        }),
      ),
    })),
  ];

  const porFecha = (a: GrupoDuplicado, b: GrupoDuplicado) =>
    (a.nivel === b.nivel ? 0 : a.nivel === "ALTA" ? -1 : 1) || b.items[0]!.fecha.getTime() - a.items[0]!.fecha.getTime();

  return { gastos: gruposGastos.sort(porFecha), entradas: gruposEntradas.sort(porFecha) };
}
