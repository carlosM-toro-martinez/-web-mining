import type { z } from "zod";
import type {
  cambiarEstadoVehiculoSchema,
  createVehiculoSchema,
  updateVehiculoSchema,
} from "./vehiculo.schema.js";

export type CreateVehiculoDTO = z.infer<typeof createVehiculoSchema>;
export type UpdateVehiculoDTO = z.infer<typeof updateVehiculoSchema>;
export type CambiarEstadoVehiculoDTO = z.infer<typeof cambiarEstadoVehiculoSchema>;
