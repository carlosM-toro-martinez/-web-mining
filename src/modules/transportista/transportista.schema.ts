import { z } from "zod";

export const tipoEntidadTransportistaSchema = z.enum(["EMPRESA", "TRABAJADOR_PARTICULAR"]);

export const createTransportistaSchema = z
  .object({
    tipoEntidad: tipoEntidadTransportistaSchema,
    nombreORazonSocial: z.string().min(1),
    nitOCi: z.string().min(1),
    banco: z.string().trim().min(1).nullish(),
    numeroCuenta: z.string().trim().min(1).nullish(),
    cuentaContableId: z.number().int().positive().nullish(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateTransportistaSchema = createTransportistaSchema.partial();

export const transportistaQuerySchema = z
  .object({
    search: z.string().optional(),
    tipoEntidad: tipoEntidadTransportistaSchema.optional(),
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();
