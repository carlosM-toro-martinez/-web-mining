import type { z } from "zod";
import type { createPrecioCombustibleSchema } from "./precioCombustible.schema.js";

export type CreatePrecioCombustibleDTO = z.infer<typeof createPrecioCombustibleSchema>;
