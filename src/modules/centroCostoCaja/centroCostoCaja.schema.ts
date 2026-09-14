import { z } from "zod";

export const createCentroCostoCajaSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
    parentId: z.number().int().positive().nullish(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateCentroCostoCajaSchema = createCentroCostoCajaSchema.partial();

export const centroCostoCajaQuerySchema = z
  .object({
    search: z.string().optional(),
    soloRaices: z.coerce.boolean().optional(),
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();
