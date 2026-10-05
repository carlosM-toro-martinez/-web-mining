import type { z } from "zod";
import type {
  anularGastoCajaSchema,
  clasificarGastosCajaSchema,
  createGastoCajaSchema,
  updateGastoCajaSchema,
} from "./gastoCaja.schema.js";

export type CreateGastoCajaDTO = z.infer<typeof createGastoCajaSchema>;
export type UpdateGastoCajaDTO = z.infer<typeof updateGastoCajaSchema>;
export type AnularGastoCajaDTO = z.infer<typeof anularGastoCajaSchema>;
export type ClasificarGastosCajaDTO = z.infer<typeof clasificarGastosCajaSchema>;

export interface FilaImportGastoCajaResultado {
  fila: number;
  tipo: "fondo" | "gasto";
  accion: "creado" | "omitido" | "revisar" | "error";
  mensaje: string;
}

export interface ResultadoImportacionGastosCaja {
  procesadas: number;
  creadas: number;
  omitidas: number;
  // Monto igual a un gasto ya registrado, pero sin texto ni n° de
  // respaldo en común — no se crea solo ni se descarta solo, queda para
  // que el usuario lo revise y decida a mano.
  paraRevisar: number;
  errores: number;
  mes: number | null;
  anio: number | null;
  resultados: FilaImportGastoCajaResultado[];
}
