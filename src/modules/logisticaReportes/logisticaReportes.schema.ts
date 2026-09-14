import { z } from "zod";

export const cuadroMensualQuerySchema = z
  .object({
    municipioId: z.coerce.number().int().positive(),
    anio: z.coerce.number().int().positive(),
    mes: z.coerce.number().int().min(1).max(12),
  })
  .strict();

export const cierreMensualSchema = z
  .object({
    municipioId: z.number().int().positive(),
    anio: z.number().int().positive(),
    mes: z.number().int().min(1).max(12),
  })
  .strict();

export const cierresQuerySchema = z
  .object({
    municipioId: z.coerce.number().int().positive().optional(),
  })
  .strict();
