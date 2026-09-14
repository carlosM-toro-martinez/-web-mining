import { z } from "zod";

export const tipoEntidadRemitenteSchema = z.enum(["EMPRESA", "TRABAJADOR_PARTICULAR"]);

export const createTarifaLiquidacionSchema = z
  .object({
    tipoEntidad: tipoEntidadRemitenteSchema,
    tipoMineralId: z.number().int().positive().nullish(),
    precioPorTonelada: z.number().positive(),
    vigenteDesde: z.coerce.date(),
  })
  .strict();

export const tarifaLiquidacionQuerySchema = z
  .object({
    tipoEntidad: tipoEntidadRemitenteSchema.optional(),
    tipoMineralId: z.coerce.number().int().positive().optional(),
    soloVigentes: z.coerce.boolean().optional(),
  })
  .strict();
