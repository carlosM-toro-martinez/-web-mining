import { z } from "zod";

export const reporteCajaChicaQuerySchema = z
  .object({
    cajaId: z.coerce.number().int().positive().optional(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
  })
  .strict();

export const estadoCuentaCajaQuerySchema = z
  .object({
    cajaId: z.coerce.number().int().positive(),
  })
  .strict();

export const estadoCuentaBancariaQuerySchema = z
  .object({
    cuentaBancariaId: z.coerce.number().int().positive(),
  })
  .strict();
