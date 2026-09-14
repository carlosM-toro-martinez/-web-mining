import type { z } from "zod";
import type {
  createConceptoLiquidacionSchema,
  updateConceptoLiquidacionSchema,
} from "./conceptoLiquidacion.schema.js";

export type CreateConceptoLiquidacionDTO = z.infer<typeof createConceptoLiquidacionSchema>;
export type UpdateConceptoLiquidacionDTO = z.infer<typeof updateConceptoLiquidacionSchema>;
