import { z } from "zod";

export const createCategoriaInventarioSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
    parentId: z.number().int().positive().optional(),
  })
  .strict();

export const updateCategoriaInventarioSchema = z
  .object({
    codigo: z.string().min(1).optional(),
    nombre: z.string().min(1).optional(),
    parentId: z.number().int().positive().nullable().optional(),
  })
  .strict();

export const categoriaInventarioQuerySchema = z
  .object({
    parentId: z.coerce.number().int().positive().optional(),
  })
  .strict();

