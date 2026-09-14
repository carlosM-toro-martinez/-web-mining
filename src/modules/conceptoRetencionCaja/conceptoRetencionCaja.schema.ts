import { z } from "zod";

export const tipoRetencionCajaSchema = z.enum(["RC_IVA", "IUE_COMPRAS", "IT"]);

export const createConceptoRetencionCajaSchema = z
  .object({
    codigo: tipoRetencionCajaSchema,
    nombre: z.string().min(1),
    porcentaje: z.number().positive().max(100),
    cuentaContableCajaId: z.number().int().positive(),
    activo: z.boolean().optional(),
  })
  .strict();

// El código (tipo de retención) no se puede cambiar tras crear el concepto:
// solo se actualizan el nombre, la tasa o la cuenta donde se acredita.
export const updateConceptoRetencionCajaSchema = z
  .object({
    nombre: z.string().min(1).optional(),
    porcentaje: z.number().positive().max(100).optional(),
    cuentaContableCajaId: z.number().int().positive().optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const conceptoRetencionCajaQuerySchema = z
  .object({
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();
