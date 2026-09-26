import { z } from "zod";

export const tipoEntidadTransportistaSchema = z.enum(["EMPRESA", "TRABAJADOR_PARTICULAR"]);

// transportistaId permite negociar una tarifa propia con una empresa
// puntual (ej. un contrato especial con EMUSA); si se omite, la tarifa
// aplica genéricamente a todo el tipoEntidad.
export const createTarifaLiquidacionSchema = z
  .object({
    tipoEntidad: tipoEntidadTransportistaSchema,
    transportistaId: z.number().int().positive().nullish(),
    tipoMineralId: z.number().int().positive().nullish(),
    precioPorTonelada: z.number().positive(),
    vigenteDesde: z.coerce.date(),
  })
  .strict();

export const tarifaLiquidacionQuerySchema = z
  .object({
    tipoEntidad: tipoEntidadTransportistaSchema.optional(),
    transportistaId: z.coerce.number().int().positive().optional(),
    tipoMineralId: z.coerce.number().int().positive().optional(),
    soloVigentes: z.coerce.boolean().optional(),
  })
  .strict();
