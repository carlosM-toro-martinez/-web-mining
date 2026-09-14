import type { Prisma } from "@prisma/client";

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

// Única función a tocar cuando se confirme el formato definitivo del
// correlativo de lote (hoy el formato exacto aún no está confirmado).
function formatearCorrelativoLote(numero: number, anio: number): string {
  return `LT-${anio}-${String(numero).padStart(6, "0")}`;
}

export async function generarCorrelativoLote(
  tx: Prisma.TransactionClient,
  fechaDespachoReal: Date,
): Promise<string> {
  const anio = fechaDespachoReal.getUTCFullYear();
  const numero = await reservarSiguienteNumero(tx, `LOTE_DESPACHO_${anio}`);
  return formatearCorrelativoLote(numero, anio);
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
