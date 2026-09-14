import { z } from "zod";

export const claseCuentaCajaSchema = z.enum(["BAL", "IND", "MAY"]);

export const createCuentaContableCajaSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
    clase: claseCuentaCajaSchema,
    nivel: z.number().int().positive(),
    monedaCodigo: z.string().min(1).max(1),
    requiereCentroCosto: z.boolean().optional(),
    requiereFuncionGasto: z.boolean().optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateCuentaContableCajaSchema = createCuentaContableCajaSchema.partial();

export const cuentaContableCajaQuerySchema = z
  .object({
    search: z.string().optional(),
    clase: claseCuentaCajaSchema.optional(),
    soloActivas: z.coerce.boolean().optional(),
  })
  .strict();
