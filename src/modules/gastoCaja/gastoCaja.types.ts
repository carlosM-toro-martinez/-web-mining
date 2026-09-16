import type { z } from "zod";
import type { anularGastoCajaSchema, createGastoCajaSchema, updateGastoCajaSchema } from "./gastoCaja.schema.js";

export type CreateGastoCajaDTO = z.infer<typeof createGastoCajaSchema>;
export type UpdateGastoCajaDTO = z.infer<typeof updateGastoCajaSchema>;
export type AnularGastoCajaDTO = z.infer<typeof anularGastoCajaSchema>;
