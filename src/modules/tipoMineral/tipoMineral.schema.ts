import { z } from "zod";

export const createTipoMineralSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateTipoMineralSchema = createTipoMineralSchema.partial();

export const tipoMineralQuerySchema = z
  .object({
    search: z.string().optional(),
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();
