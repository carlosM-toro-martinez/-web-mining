import { z } from "zod";

export const createProductoSchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  unidad: z.string().min(1),
  categoriaId: z.number(),
  esEpp: z.boolean().optional(),
});

export const updateProductoSchema = createProductoSchema.partial();

export const productoQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
});
