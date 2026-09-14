import type { z } from "zod";
import type { createTarifaLiquidacionSchema } from "./tarifaLiquidacion.schema.js";

export type CreateTarifaLiquidacionDTO = z.infer<typeof createTarifaLiquidacionSchema>;
