import { z } from "zod";

export const createIngenioSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateIngenioSchema = createIngenioSchema.partial();

export const ingenioQuerySchema = z
  .object({
    search: z.string().optional(),
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();
