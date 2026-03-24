import type { z } from "zod";
import type { createProductoSchema, updateProductoSchema } from "./producto.schema.js";

export type CreateProductoDTO = z.infer<typeof createProductoSchema>;
export type UpdateProductoDTO = z.infer<typeof updateProductoSchema>;
