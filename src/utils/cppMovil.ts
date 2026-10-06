import { HttpError } from "../errors/http.error.js";

// Mes desde el cual el inventario se valora con CPP móvil (kardex en tiempo real).
// Sin CPP_MOVIL_DESDE el sistema conserva el comportamiento anterior (CPP periódico + backfill).
type Periodo = { anio: number; mes: number };

let cache: { raw: string | undefined; periodo: Periodo | null } | null = null;

export function inicioCppMovil(): Periodo | null {
  const raw = process.env.CPP_MOVIL_DESDE?.trim() || undefined;
  if (cache && cache.raw === raw) return cache.periodo;

  let periodo: Periodo | null = null;
  if (raw) {
    const match = /^(\d{4})-(\d{2})$/.exec(raw);
    const anio = match ? Number(match[1]) : NaN;
    const mes = match ? Number(match[2]) : NaN;
    if (!match || mes < 1 || mes > 12) {
      throw new Error(`CPP_MOVIL_DESDE inválido: "${raw}". Formato esperado YYYY-MM`);
    }
    periodo = { anio, mes };
  }
  cache = { raw, periodo };
  return periodo;
}

export function cppMovilActivo(): boolean {
  return inicioCppMovil() !== null;
}

export function esMesCppMovil(anio: number, mes: number): boolean {
  const inicio = inicioCppMovil();
  if (!inicio) return false;
  return anio > inicio.anio || (anio === inicio.anio && mes >= inicio.mes);
}

export function esFechaCppMovil(fecha: Date): boolean {
  return esMesCppMovil(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1);
}

export function fechaInicioCppMovil(): Date | null {
  const inicio = inicioCppMovil();
  return inicio ? new Date(Date.UTC(inicio.anio, inicio.mes - 1, 1)) : null;
}

export function assertMesSinCppMovil(anio: number, mes: number, accion: string): void {
  if (esMesCppMovil(anio, mes)) {
    throw new HttpError(
      `${accion} no está disponible para ${String(mes).padStart(2, "0")}/${anio}: ese mes usa CPP móvil y el kardex se calcula en tiempo real`,
      409,
    );
  }
}

export function assertCppMovilInactivo(accion: string): void {
  if (cppMovilActivo()) {
    throw new HttpError(
      `${accion} no está disponible con el CPP móvil activo: modificaría el stock sin pasar por el kardex`,
      409,
    );
  }
}
