import type { z } from "zod";
import type {
  anularRendicionCajaSchema,
  createRendicionCajaSchema,
} from "./rendicionCaja.schema.js";

export type CreateRendicionCajaDTO = z.infer<typeof createRendicionCajaSchema>;
export type AnularRendicionCajaDTO = z.infer<typeof anularRendicionCajaSchema>;
