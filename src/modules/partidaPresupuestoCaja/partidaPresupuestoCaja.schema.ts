import { z } from "zod";

export const createPartidaPresupuestoCajaSchema = z
  .object({
    cajaId: z.number().int().positive(),
    anio: z.number().int().min(2000).max(2100),
    mes: z.number().int().min(1).max(12),
    descripcion: z.string().trim().min(1),
    montoPresupuestado: z.number().positive(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updatePartidaPresupuestoCajaSchema = createPartidaPresupuestoCajaSchema.partial();

export const partidaPresupuestoCajaQuerySchema = z
  .object({
    cajaId: z.coerce.number().int().positive().optional(),
    anio: z.coerce.number().int().optional(),
    mes: z.coerce.number().int().optional(),
    soloActivas: z.coerce.boolean().optional(),
  })
  .strict();
