import { z } from "zod";

export const tipoEntidadTransportistaSchema = z.enum(["EMPRESA", "TRABAJADOR_PARTICULAR"]);
export const tipoCombustibleViajeSchema = z.enum(["CON_COMBUSTIBLE", "SIN_COMBUSTIBLE"]);

// transportistaId permite negociar una tarifa propia con una empresa
// puntual (ej. un contrato especial con EMUSA); si se omite, la tarifa
// aplica genéricamente a todo el tipoEntidad. incluyeCombustible, si se
// omite, aplica sin importar si el viaje llevó combustible de la empresa o
// no; si se manda, la tarifa queda restringida a ese caso puntual.
export const createTarifaLiquidacionSchema = z
  .object({
    tipoEntidad: tipoEntidadTransportistaSchema,
    transportistaId: z.number().int().positive().nullish(),
    tipoMineralId: z.number().int().positive().nullish(),
    incluyeCombustible: tipoCombustibleViajeSchema.nullish(),
    precioPorTonelada: z.number().positive(),
    vigenteDesde: z.coerce.date(),
  })
  .strict();

export const tarifaLiquidacionQuerySchema = z
  .object({
    tipoEntidad: tipoEntidadTransportistaSchema.optional(),
    transportistaId: z.coerce.number().int().positive().optional(),
    tipoMineralId: z.coerce.number().int().positive().optional(),
    incluyeCombustible: tipoCombustibleViajeSchema.optional(),
    soloVigentes: z.coerce.boolean().optional(),
  })
  .strict();
