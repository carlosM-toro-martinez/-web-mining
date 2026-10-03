import { z } from "zod";

export const createPrecioCombustibleSchema = z
  .object({
    precioPorLitro: z.number().positive(),
    vigenteDesde: z.coerce.date(),
  })
  .strict();

export const precioCombustibleQuerySchema = z
  .object({
    soloVigentes: z.coerce.boolean().optional(),
  })
  .strict();
