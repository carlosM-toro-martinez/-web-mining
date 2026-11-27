import type { z } from "zod";
import type {
  createComprobanteGastoCajaSchema,
  updateComprobanteGastoCajaSchema,
} from "./comprobanteGastoCaja.schema.js";

export type CreateComprobanteGastoCajaDTO = z.infer<typeof createComprobanteGastoCajaSchema>;
export type UpdateComprobanteGastoCajaDTO = z.infer<typeof updateComprobanteGastoCajaSchema>;
