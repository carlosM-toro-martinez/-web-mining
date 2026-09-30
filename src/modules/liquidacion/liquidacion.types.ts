import type { z } from "zod";
import type {
  agregarItemConceptoSchema,
  anularLiquidacionSchema,
  comprobanteEgresoLiquidacionSchema,
  createLiquidacionSchema,
  previewLiquidacionQuerySchema,
} from "./liquidacion.schema.js";

export type CreateLiquidacionDTO = z.infer<typeof createLiquidacionSchema>;
export type AgregarItemConceptoDTO = z.infer<typeof agregarItemConceptoSchema>;
export type AnularLiquidacionDTO = z.infer<typeof anularLiquidacionSchema>;
export type PreviewLiquidacionQuery = z.infer<typeof previewLiquidacionQuerySchema>;
export type ComprobanteEgresoLiquidacionDTO = z.infer<typeof comprobanteEgresoLiquidacionSchema>;
