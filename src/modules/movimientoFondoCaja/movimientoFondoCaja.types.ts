import type { z } from "zod";
import type { createMovimientoFondoCajaSchema } from "./movimientoFondoCaja.schema.js";

export type CreateMovimientoFondoCajaDTO = z.infer<typeof createMovimientoFondoCajaSchema>;
