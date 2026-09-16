import type { z } from "zod";
import type {
  asignarBancoPresupuestoCajaSchema,
  createPresupuestoCajaSchema,
  duplicarPresupuestoCajaSchema,
  updatePresupuestoCajaSchema,
} from "./presupuestoCaja.schema.js";

export type CreatePresupuestoCajaDTO = z.infer<typeof createPresupuestoCajaSchema>;
export type UpdatePresupuestoCajaDTO = z.infer<typeof updatePresupuestoCajaSchema>;
export type AsignarBancoPresupuestoCajaDTO = z.infer<typeof asignarBancoPresupuestoCajaSchema>;
export type DuplicarPresupuestoCajaDTO = z.infer<typeof duplicarPresupuestoCajaSchema>;
