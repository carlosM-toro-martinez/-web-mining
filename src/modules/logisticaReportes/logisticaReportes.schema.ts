import { z } from "zod";
import { nivelLoteSchema } from "../loteDespacho/loteDespacho.schema.js";

export const cuadroMensualQuerySchema = z
  .object({
    // Si se omite, el cuadro consolida TODOS los municipios del mes.
    municipioId: z.coerce.number().int().positive().optional(),
    anio: z.coerce.number().int().positive(),
    mes: z.coerce.number().int().min(1).max(12),
    // Si se omite, trae todos los niveles.
    nivel: nivelLoteSchema.optional(),
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

export const combustibleQuerySchema = z
  .object({
    fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    municipioId: z.coerce.number().int().positive().optional(),
  })
  .strict();
