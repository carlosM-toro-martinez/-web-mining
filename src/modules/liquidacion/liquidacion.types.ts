import type { z } from "zod";
import type {
  agregarItemConceptoSchema,
  anularLiquidacionSchema,
  createLiquidacionSchema,
} from "./liquidacion.schema.js";

export type CreateLiquidacionDTO = z.infer<typeof createLiquidacionSchema>;
export type AgregarItemConceptoDTO = z.infer<typeof agregarItemConceptoSchema>;
export type AnularLiquidacionDTO = z.infer<typeof anularLiquidacionSchema>;
