import type { z } from "zod";
import type { createPedidoSchema, pedidoQuerySchema } from "./pedidos.schema.js";

export type CreatePedidoDTO = z.infer<typeof createPedidoSchema>;
export type PedidoQueryDTO = z.infer<typeof pedidoQuerySchema>;
