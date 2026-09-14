import type { z } from "zod";
import type { createCajaChicaSchema, updateCajaChicaSchema } from "./cajaChica.schema.js";

export type CreateCajaChicaDTO = z.infer<typeof createCajaChicaSchema>;
export type UpdateCajaChicaDTO = z.infer<typeof updateCajaChicaSchema>;
