import type { z } from "zod";
import type { createIngenioSchema, updateIngenioSchema } from "./ingenio.schema.js";

export type CreateIngenioDTO = z.infer<typeof createIngenioSchema>;
export type UpdateIngenioDTO = z.infer<typeof updateIngenioSchema>;
