import type { z } from "zod";
import type {
  createFuncionGastoCajaSchema,
  updateFuncionGastoCajaSchema,
} from "./funcionGastoCaja.schema.js";

export type CreateFuncionGastoCajaDTO = z.infer<typeof createFuncionGastoCajaSchema>;
export type UpdateFuncionGastoCajaDTO = z.infer<typeof updateFuncionGastoCajaSchema>;
