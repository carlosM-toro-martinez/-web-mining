import { z } from "zod";
import { tipoDocumentoGastoSchema } from "../gastoCaja/gastoCaja.schema.js";

export const createComprobanteGastoCajaSchema = z
  .object({
    nombre: z.string().trim().min(1).max(60),
    ayuda: z.string().trim().max(200).nullish(),
    tratamiento: tipoDocumentoGastoSchema,
    activo: z.boolean().optional(),
    orden: z.number().int().optional(),
  })
  .strict();

export const updateComprobanteGastoCajaSchema = createComprobanteGastoCajaSchema.partial();

export const comprobanteGastoCajaQuerySchema = z.object({ soloActivos: z.coerce.boolean().optional() }).strict();
