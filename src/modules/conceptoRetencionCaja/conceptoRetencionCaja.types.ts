import type { z } from "zod";
import type {
  createConceptoRetencionCajaSchema,
  updateConceptoRetencionCajaSchema,
} from "./conceptoRetencionCaja.schema.js";

export type CreateConceptoRetencionCajaDTO = z.infer<typeof createConceptoRetencionCajaSchema>;
export type UpdateConceptoRetencionCajaDTO = z.infer<typeof updateConceptoRetencionCajaSchema>;
