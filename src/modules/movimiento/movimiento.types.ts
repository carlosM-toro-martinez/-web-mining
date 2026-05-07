import type { z } from "zod";
import type { createSalidaSchema, createEntradaSchema } from "./movimiento.schema.js";

export type CreateSalidaDTO = z.infer<typeof createSalidaSchema>;
export type CreateEntradaDTO = z.infer<typeof createEntradaSchema>;
