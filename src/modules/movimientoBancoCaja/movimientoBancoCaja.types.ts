import type { z } from "zod";
import type { createMovimientoBancoCajaSchema, vincularPresupuestoSchema } from "./movimientoBancoCaja.schema.js";

export type CreateMovimientoBancoCajaDTO = z.infer<typeof createMovimientoBancoCajaSchema>;
export type VincularPresupuestoDTO = z.infer<typeof vincularPresupuestoSchema>;
