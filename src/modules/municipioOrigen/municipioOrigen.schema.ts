import { z } from "zod";

export const createMunicipioOrigenSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateMunicipioOrigenSchema = createMunicipioOrigenSchema.partial();

export const municipioOrigenQuerySchema = z
  .object({
    search: z.string().optional(),
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();
