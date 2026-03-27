import { z } from "zod";

export const createProductoSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
    unidad: z.string().min(1),
    grupoId: z.number().int().positive(),
    subgrupoId: z.number().int().positive(),
    esEpp: z.boolean().optional(),
  })
  .strict();

export const updateProductoSchema = createProductoSchema.partial();

export const productoQuerySchema = z
  .object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    search: z.string().optional(),
    grupoId: z.coerce.number().int().positive().optional(),
    subgrupoId: z.coerce.number().int().positive().optional(),
  })
  .strict();
