import { z } from "zod";

export const createAlicuotaRegaliaSchema = z
  .object({
    municipioOrigenId: z.number().int().positive(),
    tipoMineralId: z.number().int().positive(),
    porcentaje: z.number().positive().max(100),
    vigenteDesde: z.coerce.date(),
  })
  .strict();

export const alicuotaRegaliaQuerySchema = z
  .object({
    municipioOrigenId: z.coerce.number().int().positive().optional(),
    tipoMineralId: z.coerce.number().int().positive().optional(),
    soloVigentes: z.coerce.boolean().optional(),
  })
  .strict();
