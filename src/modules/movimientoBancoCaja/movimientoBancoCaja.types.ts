import type { z } from "zod";
import type { createMovimientoBancoCajaSchema } from "./movimientoBancoCaja.schema.js";

export type CreateMovimientoBancoCajaDTO = z.infer<typeof createMovimientoBancoCajaSchema>;
