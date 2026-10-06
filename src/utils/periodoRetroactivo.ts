import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http.error.js";
import { esMesCppMovil } from "./cppMovil.js";

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
export async function detectarPeriodo(
  fechaOperacion: Date | null | undefined,
  opciones?: { anulacion?: boolean },
): Promise<DeteccionPeriodo> {
  if (!fechaOperacion) return { esRetroactivo: false };

  const anioOp = fechaOperacion.getUTCFullYear();
  const mesOp  = fechaOperacion.getUTCMonth() + 1;

  const ahora      = new Date();
  const anioActual = ahora.getUTCFullYear();
  const mesActual  = ahora.getUTCMonth() + 1;

  const esMesPasado = anioOp < anioActual || (anioOp === anioActual && mesOp < mesActual);

  const cierre = await prisma.cierreMes.findUnique({
    where: { anio_mes: { anio: anioOp, mes: mesOp } },
    select: { id: true },
  });

  if (cierre) {
    throw new HttpError(`El período ${mesOp}/${anioOp} está cerrado y no permite modificaciones`, 409);
  }

  if (esMesPasado) {
    // Con CPP móvil el kardex es cronológico: no se insertan operaciones en un mes ya pasado.
    // Las anulaciones sí se permiten y se registran en el mes actual como reverso.
    if (esMesCppMovil(anioOp, mesOp)) {
      if (opciones?.anulacion) return { esRetroactivo: false };
      throw new HttpError(
        `La fecha de operación ${String(mesOp).padStart(2, "0")}/${anioOp} pertenece a un mes ya pasado con CPP móvil. ` +
          "El kardex se registra en orden cronológico: usa una fecha del mes actual.",
        409,
      );
    }
    return { esRetroactivo: true, periodoAnio: anioOp, periodoMes: mesOp };
  }

  return { esRetroactivo: false };
}
