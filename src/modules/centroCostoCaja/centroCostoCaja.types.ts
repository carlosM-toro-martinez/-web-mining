import type { z } from "zod";
import type {
  createCentroCostoCajaSchema,
  updateCentroCostoCajaSchema,
} from "./centroCostoCaja.schema.js";

export type CreateCentroCostoCajaDTO = z.infer<typeof createCentroCostoCajaSchema>;
export type UpdateCentroCostoCajaDTO = z.infer<typeof updateCentroCostoCajaSchema>;
