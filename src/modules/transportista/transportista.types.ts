import type { z } from "zod";
import type { createTransportistaSchema, updateTransportistaSchema } from "./transportista.schema.js";

export type CreateTransportistaDTO = z.infer<typeof createTransportistaSchema>;
export type UpdateTransportistaDTO = z.infer<typeof updateTransportistaSchema>;
