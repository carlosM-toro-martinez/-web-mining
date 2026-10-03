import { z } from "zod";

export const cuadroMensualQuerySchema = z
  .object({
    // Si se omite, el cuadro consolida TODOS los municipios del mes.
    municipioId: z.coerce.number().int().positive().optional(),
    anio: z.coerce.number().int().positive(),
    mes: z.coerce.number().int().min(1).max(12),
    // "Nivel 40" / "Nivel 0" / "Nivel 80" / "La Moza", tal cual se guarda en
    // LoteDespacho.nivel — si se omite, trae todos los niveles.
    nivel: z.string().trim().min(1).optional(),
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
