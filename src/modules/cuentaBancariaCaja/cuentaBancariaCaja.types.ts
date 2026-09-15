import type { z } from "zod";
import type {
  createCuentaBancariaCajaSchema,
  updateCuentaBancariaCajaSchema,
} from "./cuentaBancariaCaja.schema.js";

export type CreateCuentaBancariaCajaDTO = z.infer<typeof createCuentaBancariaCajaSchema>;
export type UpdateCuentaBancariaCajaDTO = z.infer<typeof updateCuentaBancariaCajaSchema>;
