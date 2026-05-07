import type { z } from "zod";
import type {
  createProveedorSchema,
  updateProveedorSchema,
  proveedorQuerySchema,
} from "./proveedores.schema.js";

export type CreateProveedorDTO = z.infer<typeof createProveedorSchema>;
export type UpdateProveedorDTO = z.infer<typeof updateProveedorSchema>;
export type ProveedorQueryDTO = z.infer<typeof proveedorQuerySchema>;
