import type { z } from "zod";
import type {
  createMunicipioOrigenSchema,
  updateMunicipioOrigenSchema,
} from "./municipioOrigen.schema.js";

export type CreateMunicipioOrigenDTO = z.infer<typeof createMunicipioOrigenSchema>;
export type UpdateMunicipioOrigenDTO = z.infer<typeof updateMunicipioOrigenSchema>;
