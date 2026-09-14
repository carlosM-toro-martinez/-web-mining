import { z } from "zod";

export const tipoEntidadRemitenteSchema = z.enum(["EMPRESA", "TRABAJADOR_PARTICULAR"]);

export const createRemitenteSchema = z
  .object({
    tipoEntidad: tipoEntidadRemitenteSchema,
    nombreORazonSocial: z.string().min(1),
    nitOCi: z.string().min(1),
    municipioId: z.number().int().positive().nullish(),
    cuentaContableId: z.number().int().positive().nullish(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateRemitenteSchema = createRemitenteSchema.partial();

export const remitenteQuerySchema = z
  .object({
    search: z.string().optional(),
    tipoEntidad: tipoEntidadRemitenteSchema.optional(),
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();
