import type { z } from "zod";
import type { createChoferSchema, updateChoferSchema } from "./chofer.schema.js";

export type CreateChoferDTO = z.infer<typeof createChoferSchema>;
export type UpdateChoferDTO = z.infer<typeof updateChoferSchema>;
