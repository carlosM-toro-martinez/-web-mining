import type { z } from "zod";
import type {
  anularMovimientoBancoCajaSchema,
  createMovimientoBancoCajaSchema,
  remesaRapidaSchema,
  vincularPresupuestoSchema,
} from "./movimientoBancoCaja.schema.js";

export type CreateMovimientoBancoCajaDTO = z.infer<typeof createMovimientoBancoCajaSchema>;
export type VincularPresupuestoDTO = z.infer<typeof vincularPresupuestoSchema>;
export type RemesaRapidaDTO = z.infer<typeof remesaRapidaSchema>;
export type AnularMovimientoBancoCajaDTO = z.infer<typeof anularMovimientoBancoCajaSchema>;
