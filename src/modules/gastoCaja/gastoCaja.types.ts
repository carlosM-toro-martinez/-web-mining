import type { z } from "zod";
import type { anularGastoCajaSchema, createGastoCajaSchema, updateGastoCajaSchema } from "./gastoCaja.schema.js";

export type CreateGastoCajaDTO = z.infer<typeof createGastoCajaSchema>;
export type UpdateGastoCajaDTO = z.infer<typeof updateGastoCajaSchema>;
export type AnularGastoCajaDTO = z.infer<typeof anularGastoCajaSchema>;

export interface FilaImportGastoCajaResultado {
  fila: number;
  tipo: "fondo" | "gasto";
  accion: "creado" | "omitido" | "error";
  mensaje: string;
}

export interface ResultadoImportacionGastosCaja {
  procesadas: number;
  creadas: number;
  omitidas: number;
  errores: number;
  mes: number | null;
  anio: number | null;
  resultados: FilaImportGastoCajaResultado[];
}
