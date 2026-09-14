import type { z } from "zod";
import type { anularGastoCajaSchema, createGastoCajaSchema } from "./gastoCaja.schema.js";

export type CreateGastoCajaDTO = z.infer<typeof createGastoCajaSchema>;
export type AnularGastoCajaDTO = z.infer<typeof anularGastoCajaSchema>;
