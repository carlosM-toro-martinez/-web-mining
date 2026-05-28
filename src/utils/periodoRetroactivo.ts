import { prisma } from "../config/prisma.js";

export interface PeriodoRetroactivo {
  esRetroactivo: true;
  periodoAnio: number;
  periodoMes: number;
}

export interface PeriodoNormal {
  esRetroactivo: false;
}

export type DeteccionPeriodo = PeriodoRetroactivo | PeriodoNormal;

/**
 * Determina si una fechaOperacion corresponde a un período retroactivo.
 *
 * Es retroactivo cuando:
 *  1. La fechaOperacion es un mes anterior al mes actual (pasado), O
 *  2. El período está explícitamente cerrado en CierreMes (aunque sea el mes actual)
 *
 * Si fechaOperacion es null/undefined → no retroactivo (operación normal).
 */
export async function detectarPeriodo(fechaOperacion: Date | null | undefined): Promise<DeteccionPeriodo> {
  if (!fechaOperacion) return { esRetroactivo: false };

  const anioOp = fechaOperacion.getFullYear();
  const mesOp = fechaOperacion.getMonth() + 1;

  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth() + 1;

  const esMesPasado =
    anioOp < anioActual || (anioOp === anioActual && mesOp < mesActual);

  if (esMesPasado) {
    return { esRetroactivo: true, periodoAnio: anioOp, periodoMes: mesOp };
  }

  // Aunque sea el mes actual, si está cerrado explícitamente → retroactivo
  const cierre = await prisma.cierreMes.findUnique({
    where: { anio_mes: { anio: anioOp, mes: mesOp } },
    select: { id: true },
  });

  if (cierre) {
    return { esRetroactivo: true, periodoAnio: anioOp, periodoMes: mesOp };
  }

  return { esRetroactivo: false };
}
