import type { z } from "zod";
import { createMuestraSchema, createElementoSchema } from "./exploraciones.schema.js";

export type CreateElementoDTO = z.infer<typeof createElementoSchema>;

export type CreateMuestraDTO = z.infer<typeof createMuestraSchema>;

export type ResultDTO = {
  elemento: string;
  valor: number;
};
