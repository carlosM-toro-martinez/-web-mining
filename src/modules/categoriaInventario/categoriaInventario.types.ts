import type { z } from "zod";
import type {
  createCategoriaInventarioSchema,
  updateCategoriaInventarioSchema,
  categoriaInventarioQuerySchema,
} from "./categoriaInventario.schema.js";

export type CreateCategoriaInventarioDTO = z.infer<typeof createCategoriaInventarioSchema>;
export type UpdateCategoriaInventarioDTO = z.infer<typeof updateCategoriaInventarioSchema>;
export type CategoriaInventarioQueryDTO = z.infer<typeof categoriaInventarioQuerySchema>;

