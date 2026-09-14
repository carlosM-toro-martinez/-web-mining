import type { z } from "zod";
import type { createRemitenteSchema, updateRemitenteSchema } from "./remitente.schema.js";

export type CreateRemitenteDTO = z.infer<typeof createRemitenteSchema>;
export type UpdateRemitenteDTO = z.infer<typeof updateRemitenteSchema>;
