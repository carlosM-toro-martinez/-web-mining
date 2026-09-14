import type { z } from "zod";
import type { cierreMensualSchema, cuadroMensualQuerySchema } from "./logisticaReportes.schema.js";

export type CuadroMensualQuery = z.infer<typeof cuadroMensualQuerySchema>;
export type CierreMensualDTO = z.infer<typeof cierreMensualSchema>;
