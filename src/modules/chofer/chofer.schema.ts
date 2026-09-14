import { z } from "zod";

export const createChoferSchema = z
  .object({
    nombre: z.string().min(1),
    ci: z.string().min(1),
    licencia: z.string().optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateChoferSchema = createChoferSchema.partial();

export const choferQuerySchema = z
  .object({
    search: z.string().optional(),
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();
