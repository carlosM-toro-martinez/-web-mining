import { z } from "zod";

export const tipoMovimientoFondoCajaSchema = z.enum([
  "REMESA_PRESUPUESTO",
  "REMESA_SUELDOS",
  "REMESA_OTROS",
  "REPOSICION",
]);
export const monedaCajaSchema = z.enum(["BOB", "USD"]);

export const createMovimientoFondoCajaSchema = z
  .object({
    cajaId: z.number().int().positive(),
    tipo: tipoMovimientoFondoCajaSchema,
    monto: z.number().positive(),
    moneda: monedaCajaSchema,
    fecha: z.coerce.date(),
    referencia: z.string().optional(),
  })
  .strict();

export const movimientoFondoCajaQuerySchema = z
  .object({
    cajaId: z.coerce.number().int().positive().optional(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
  })
  .strict();
