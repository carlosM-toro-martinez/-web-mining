import type { z } from "zod";
import type {
  anularLoteSchema,
  avanzarEstadoLoteSchema,
  createLoteDespachoSchema,
  registrarPesajeSchema,
  regularizarFormulario101Schema,
} from "./loteDespacho.schema.js";

export type CreateLoteDespachoDTO = z.infer<typeof createLoteDespachoSchema>;
export type RegularizarFormulario101DTO = z.infer<typeof regularizarFormulario101Schema>;
export type AvanzarEstadoLoteDTO = z.infer<typeof avanzarEstadoLoteSchema>;
export type RegistrarPesajeDTO = z.infer<typeof registrarPesajeSchema>;
export type AnularLoteDTO = z.infer<typeof anularLoteSchema>;
