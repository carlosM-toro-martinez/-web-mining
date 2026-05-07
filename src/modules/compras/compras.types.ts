import type { z } from "zod";
import type {
  createCompraSchema,
  recibirCompraSchema,
  compraQuerySchema,
} from "./compras.schema.js";

export type CreateCompraDTO = z.infer<typeof createCompraSchema>;
export type RecibirCompraDTO = z.infer<typeof recibirCompraSchema>;
export type CompraQueryDTO = z.infer<typeof compraQuerySchema>;
