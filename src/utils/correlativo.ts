import type { Prisma } from "@prisma/client";
import { HttpError } from "../errors/http.error.js";

// Reserva el siguiente número de una secuencia identificada por `clave`
// (ej. "LOTE_DESPACHO_2026") dentro de una transacción Prisma. El `upsert`
// compila a un único INSERT ... ON CONFLICT DO UPDATE atómico en Postgres:
// si dos requests concurrentes reservan la misma clave, la segunda espera
// el lock de fila de la primera y ve el valor ya incrementado — nunca hay
// dos correlativos iguales, aunque sí puede saltar un número si el resto
// de la transacción falla (estándar y aceptable en correlativos fiscales).
async function reservarSiguienteNumero(tx: Prisma.TransactionClient, clave: string): Promise<number> {
  const contador = await tx.correlativoContador.upsert({
    where: { clave },
    create: { clave, ultimoNumero: 1 },
    update: { ultimoNumero: { increment: 1 } },
  });
  return contador.ultimoNumero;
}

// Formato real confirmado por el usuario contra el Conocimiento físico
// ("53/09" = correlativo 53, emitido en septiembre): un único contador
// compartido por TODA la mina (todos los transportistas y vehículos juntos),
// que se reinicia cada mes. Como el mismo "53/09" se repite cada septiembre
// de cada año, la unicidad en base de datos NO puede depender solo del
// string — por eso LoteDespacho.anio se guarda aparte y la unicidad real es
// @@unique([correlativo, anio]) en el schema, nunca correlativo solo.
function formatearCorrelativoLote(numero: number, mes: number): string {
  return `${numero}/${String(mes).padStart(2, "0")}`;
}

// Al anular un lote su número NO se pierde (la serie del Conocimiento tiene
// que quedar seguida): el anulado pasa a "27/10 ANULADO" — sigue en el
// historial — y el "27/10" queda libre para el próximo lote de ese mes.
const SUFIJO_LOTE_ANULADO = " ANULADO";

export async function correlativoLiberadoDeLoteAnulado(
  tx: Prisma.TransactionClient,
  correlativo: string,
  anio: number,
): Promise<string> {
  const base = `${correlativo}${SUFIJO_LOTE_ANULADO}`;
  let candidato = base;
  // Si el mismo número ya se anuló antes (reusado y vuelto a anular).
  for (let n = 2; await tx.loteDespacho.findUnique({ where: { correlativo_anio: { correlativo: candidato, anio } } }); n++) {
    candidato = `${base} ${n}`;
  }
  return candidato;
}

// La serie de un mes es dinámica: los números que ocupan los lotes vigentes
// de ese mes ("27/10"; los anulados llevan sufijo y no ocupan). El próximo
// lote toma siempre el MENOR número libre — el que dejó una anulación o una
// edición —, así la serie del Conocimiento nunca queda con huecos.
// Bloquea la serie hasta el fin de la transacción: dos altas/ediciones
// simultáneas del mismo mes no pueden tomar el mismo número.
async function leerSerieLote(tx: Prisma.TransactionClient, anio: number, mes: number, excluirLoteId?: string) {
  const mesTxt = String(mes).padStart(2, "0");
  const clave = `LOTE_DESPACHO_${anio}_${mesTxt}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${clave}))`;

  // Acepta también el mes sin cero ("37/9") de algunas importaciones viejas.
  const patron = new RegExp(`^(\\d+)/0?${mes}$`);
  const lotes = await tx.loteDespacho.findMany({
    where: { anio, correlativo: { contains: "/" }, ...(excluirLoteId ? { id: { not: excluirLoteId } } : {}) },
    select: { correlativo: true },
  });
  const ocupados = new Set<number>();
  for (const l of lotes) {
    const m = patron.exec(l.correlativo);
    if (m) ocupados.add(Number(m[1]));
  }
  let siguiente = 1;
  while (ocupados.has(siguiente)) siguiente++;
  const maximo = ocupados.size > 0 ? Math.max(...ocupados) : 0;
  return { clave, ocupados, siguiente, maximo };
}

// El contador queda siempre en el número más alto de la serie (lo usa la
// importación del Excel); la serie en sí sale de los lotes, no de acá.
async function sincronizarContador(tx: Prisma.TransactionClient, clave: string, maximo: number) {
  await tx.correlativoContador.upsert({
    where: { clave },
    create: { clave, ultimoNumero: maximo },
    update: { ultimoNumero: maximo },
  });
}

export async function generarCorrelativoLote(
  tx: Prisma.TransactionClient,
  fechaDespachoReal: Date,
  excluirLoteId?: string,
): Promise<{ correlativo: string; anio: number }> {
  const anio = fechaDespachoReal.getUTCFullYear();
  const mes = fechaDespachoReal.getUTCMonth() + 1;
  const serie = await leerSerieLote(tx, anio, mes, excluirLoteId);
  await sincronizarContador(tx, serie.clave, Math.max(serie.maximo, serie.siguiente));
  return { correlativo: formatearCorrelativoLote(serie.siguiente, mes), anio };
}

// Número puesto a mano al editar un lote: no puede repetir el de otro lote
// del mes ni saltarse la serie (a lo sumo, el siguiente al más alto).
export async function asignarCorrelativoLoteManual(
  tx: Prisma.TransactionClient,
  loteId: string,
  numero: number,
  fechaDespachoReal: Date,
): Promise<{ correlativo: string; anio: number }> {
  const anio = fechaDespachoReal.getUTCFullYear();
  const mes = fechaDespachoReal.getUTCMonth() + 1;
  const serie = await leerSerieLote(tx, anio, mes, loteId);
  const correlativo = formatearCorrelativoLote(numero, mes);
  if (serie.ocupados.has(numero)) {
    throw new HttpError(`El N° ${correlativo} ya lo tiene otro lote de ese mes`, 409);
  }
  if (numero > serie.maximo + 1) {
    throw new HttpError(
      `No se puede saltar la serie: el número más alto de ese mes es ${serie.maximo}, como máximo puede ser ${serie.maximo + 1}`,
      409,
    );
  }
  // Ojo: el lote editado puede ser el que tenía el número más alto.
  await sincronizarContador(tx, serie.clave, Math.max(serie.maximo, numero));
  return { correlativo, anio };
}

// Formato observado en los comprobantes reales de Caja Lipeña ("P-1/2025",
// "P-2/2025", "P-3/2025" para Oct/Nov/Dic 2025). El "N" NO es un correlativo
// que se incrementa por documento: es la posición del mes dentro del "año
// minero" (arranca en octubre y termina en septiembre del año siguiente),
// así que octubre siempre es P-1, noviembre P-2, ..., septiembre P-12 —
// confirmado por el usuario. El "/AAAA" es el año en que EMPEZÓ ese año
// minero (el de octubre), no el año calendario del mes del período: todo
// el año minero que arranca en octubre de 2025 (hasta septiembre de 2026
// inclusive) se etiqueta "/2025" — por eso septiembre de 2026 es "P-12/2025",
// no "P-12/2026" (corregido tras aclaración del usuario). Si se cierran dos
// rendiciones del mismo mes para la misma caja, ambas comparten el mismo
// folio (igual que el documento real, que es mensual).
const MESES_DESDE_INICIO_ANIO_MINERO: Record<number, number> = {
  10: 1, // octubre
  11: 2,
  12: 3,
  1: 4,
  2: 5,
  3: 6,
  4: 7,
  5: 8,
  6: 9,
  7: 10,
  8: 11,
  9: 12, // septiembre
};

function formatearFolioRendicionCaja(periodoHasta: Date): string {
  const mes = periodoHasta.getUTCMonth() + 1;
  const anioCalendario = periodoHasta.getUTCFullYear();
  const anioMinero = mes >= 10 ? anioCalendario : anioCalendario - 1;
  const posicion = MESES_DESDE_INICIO_ANIO_MINERO[mes];
  return `P-${posicion}/${anioMinero}`;
}

export async function generarFolioRendicionCaja(
  tx: Prisma.TransactionClient,
  cajaCodigo: string,
  periodoHasta: Date,
): Promise<string> {
  void tx;
  void cajaCodigo;
  return formatearFolioRendicionCaja(periodoHasta);
}

// Gestión minera (octubre–septiembre) identificada por el año en que
// termina: oct-2026..sep-2027 = 2027 (el "27" de "Nº 01/27").
export function gestionMineraDe(fecha: Date): number {
  return fecha.getUTCMonth() + 1 >= 10 ? fecha.getUTCFullYear() + 1 : fecha.getUTCFullYear();
}

// Folio impreso de la Liquidación de Transporte ("Nº 01/27"): un contador
// compartido por TODOS los transportistas (empresa o particular) que se
// reinicia en cada gestión minera — se asigna recién al CERRAR la
// liquidación, igual que un talonario numerado a mano.
export async function generarNumeroLiquidacionTransporte(
  tx: Prisma.TransactionClient,
  gestion: number,
): Promise<number> {
  return reservarSiguienteNumero(tx, `LIQUIDACION_TRANSPORTE_${gestion}`);
}

// Folio del Comprobante de Egresos ("Nº 000188" en el documento físico real):
// un contador global propio por módulo, que nunca se reinicia — a
// diferencia del folio de la liquidación o del correlativo del lote, este
// se asigna recién la primera vez que alguien genera el comprobante (no al
// registrar el gasto ni al cerrar la liquidación), y queda fijo para
// siempre: volver a generarlo después muestra el mismo número.
export async function generarNumeroComprobanteEgresoGasto(tx: Prisma.TransactionClient): Promise<number> {
  return reservarSiguienteNumero(tx, "COMPROBANTE_EGRESO_GASTO");
}
