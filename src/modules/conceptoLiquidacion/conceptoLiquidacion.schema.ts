import { z } from "zod";

export const tipoConceptoLiquidacionSchema = z.enum(["ABONO", "DEDUCCION"]);

export const createConceptoLiquidacionSchema = z
  .object({
    nombre: z.string().min(1),
    tipo: tipoConceptoLiquidacionSchema,
    activo: z.boolean().optional(),
    // Solo tiene sentido en DEDUCCION — ver calcularCombustibleSugerido() en
    // liquidacion.service.ts. No se valida aquí con .refine() porque
    // update() permite mandar solo esCombustible sin repetir el tipo.
    esCombustible: z.boolean().optional(),
  })
  .strict();

export const updateConceptoLiquidacionSchema = createConceptoLiquidacionSchema.partial();

export const conceptoLiquidacionQuerySchema = z
  .object({
    search: z.string().optional(),
    tipo: tipoConceptoLiquidacionSchema.optional(),
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();
