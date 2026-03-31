import type { z } from "zod";
import type { createSalidaSchema } from "./movimiento.schema.js";

export type CreateSalidaDTO = z.infer<typeof createSalidaSchema>;

