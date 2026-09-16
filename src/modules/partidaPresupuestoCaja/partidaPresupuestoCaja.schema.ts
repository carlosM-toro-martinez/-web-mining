import { z } from "zod";

export const createPartidaPresupuestoCajaSchema = z
  .object({
    presupuestoId: z.number().int().positive(),
    descripcion: z.string().trim().min(1),
    montoPresupuestado: z.number().positive(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updatePartidaPresupuestoCajaSchema = createPartidaPresupuestoCajaSchema.partial();

export const partidaPresupuestoCajaQuerySchema = z
  .object({
    presupuestoId: z.coerce.number().int().positive().optional(),
    cajaId: z.coerce.number().int().positive().optional(),
    anio: z.coerce.number().int().optional(),
    mes: z.coerce.number().int().optional(),
    soloActivas: z.coerce.boolean().optional(),
  })
  .strict();
