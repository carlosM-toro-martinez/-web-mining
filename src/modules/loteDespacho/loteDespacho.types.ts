import type { z } from "zod";
import type {
  anularLoteSchema,
  avanzarEstadoLoteSchema,
  corregirEstadoLoteSchema,
  createLoteDespachoSchema,
  registrarCombustibleEntregadoSchema,
  registrarPesajeSchema,
  transbordarLoteSchema,
  updateLoteDespachoSchema,
} from "./loteDespacho.schema.js";

export type CreateLoteDespachoDTO = z.infer<typeof createLoteDespachoSchema>;
export type UpdateLoteDespachoDTO = z.infer<typeof updateLoteDespachoSchema>;
export type AvanzarEstadoLoteDTO = z.infer<typeof avanzarEstadoLoteSchema>;
export type CorregirEstadoLoteDTO = z.infer<typeof corregirEstadoLoteSchema>;
export type RegistrarPesajeDTO = z.infer<typeof registrarPesajeSchema>;
export type RegistrarCombustibleEntregadoDTO = z.infer<typeof registrarCombustibleEntregadoSchema>;
export type AnularLoteDTO = z.infer<typeof anularLoteSchema>;
export type TransbordarLoteDTO = z.infer<typeof transbordarLoteSchema>;

export interface FilaImportLoteResultado {
  fila: number;
  correlativo: string | null;
  accion: "creado" | "actualizado" | "omitido" | "error";
  mensaje: string;
}

export interface ResultadoImportacionLotes {
  procesadas: number;
  creadas: number;
  actualizadas: number;
  omitidas: number;
  errores: number;
  resultados: FilaImportLoteResultado[];
}
