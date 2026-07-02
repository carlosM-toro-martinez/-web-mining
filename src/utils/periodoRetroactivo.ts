import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http.error.js";

export interface PeriodoRetroactivo {
  esRetroactivo: true;
  periodoAnio: number;
  periodoMes: number;
}

export interface PeriodoNormal {
  esRetroactivo: false;
}

export type DeteccionPeriodo = PeriodoRetroactivo | PeriodoNormal;

export async function verificarMesAbierto(anio: number, mes: number): Promise<void> {
  const cierre = await prisma.cierreMes.findUnique({
    where: { anio_mes: { anio, mes } },
    select: { id: true },
  });
  if (cierre) {
    throw new HttpError(`El período ${mes}/${anio} está cerrado y no permite modificaciones`, 409);
  }
}

/**
 * Determina si una fechaOperacion corresponde a un período retroactivo.
 * Lanza HttpError 409 si el período ya está cerrado — ninguna operación
 * puede modificar un mes cerrado.
 */
export async function detectarPeriodo(fechaOperacion: Date | null | undefined): Promise<DeteccionPeriodo> {
  if (!fechaOperacion) return { esRetroactivo: false };

  const anioOp = fechaOperacion.getFullYear();
  const mesOp  = fechaOperacion.getMonth() + 1;

  const ahora      = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual  = ahora.getMonth() + 1;

  const esMesPasado = anioOp < anioActual || (anioOp === anioActual && mesOp < mesActual);

  const cierre = await prisma.cierreMes.findUnique({
    where: { anio_mes: { anio: anioOp, mes: mesOp } },
    select: { id: true },
  });

  if (cierre) {
    throw new HttpError(`El período ${mesOp}/${anioOp} está cerrado y no permite modificaciones`, 409);
  }

  if (esMesPasado) {
    return { esRetroactivo: true, periodoAnio: anioOp, periodoMes: mesOp };
  }

  return { esRetroactivo: false };
}
