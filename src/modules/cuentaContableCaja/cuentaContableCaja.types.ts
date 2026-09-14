import type { z } from "zod";
import type {
  createCuentaContableCajaSchema,
  updateCuentaContableCajaSchema,
} from "./cuentaContableCaja.schema.js";

export type CreateCuentaContableCajaDTO = z.infer<typeof createCuentaContableCajaSchema>;
export type UpdateCuentaContableCajaDTO = z.infer<typeof updateCuentaContableCajaSchema>;
