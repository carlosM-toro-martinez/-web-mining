import type { z } from "zod";
import type {
  anularLoteSchema,
  avanzarEstadoLoteSchema,
  createLoteDespachoSchema,
  registrarPesajeSchema,
  transbordarLoteSchema,
} from "./loteDespacho.schema.js";

export type CreateLoteDespachoDTO = z.infer<typeof createLoteDespachoSchema>;
export type AvanzarEstadoLoteDTO = z.infer<typeof avanzarEstadoLoteSchema>;
export type RegistrarPesajeDTO = z.infer<typeof registrarPesajeSchema>;
export type AnularLoteDTO = z.infer<typeof anularLoteSchema>;
export type TransbordarLoteDTO = z.infer<typeof transbordarLoteSchema>;
