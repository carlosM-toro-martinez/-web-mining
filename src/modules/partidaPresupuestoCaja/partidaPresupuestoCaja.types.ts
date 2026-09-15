import type { z } from "zod";
import type {
  createPartidaPresupuestoCajaSchema,
  updatePartidaPresupuestoCajaSchema,
} from "./partidaPresupuestoCaja.schema.js";

export type CreatePartidaPresupuestoCajaDTO = z.infer<typeof createPartidaPresupuestoCajaSchema>;
export type UpdatePartidaPresupuestoCajaDTO = z.infer<typeof updatePartidaPresupuestoCajaSchema>;
