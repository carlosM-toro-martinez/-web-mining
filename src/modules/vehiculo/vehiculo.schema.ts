import { z } from "zod";

export const estadoVehiculoSchema = z.enum([
  "DISPONIBLE",
  "EN_TRANSITO",
  "EN_BALANZA",
  "CON_FALLA_MECANICA",
  "EN_MANTENIMIENTO",
]);

export const createVehiculoSchema = z
  .object({
    placa: z.string().min(1),
    tipo: z.string().min(1),
    capacidadTon: z.number().positive(),
    propietarioId: z.number().int().positive().nullish(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateVehiculoSchema = createVehiculoSchema.partial();

export const vehiculoQuerySchema = z
  .object({
    search: z.string().optional(),
    estadoActual: estadoVehiculoSchema.optional(),
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();

export const cambiarEstadoVehiculoSchema = z
  .object({
    estado: estadoVehiculoSchema,
    motivo: z.string().trim().min(1).optional(),
  })
  .strict();
