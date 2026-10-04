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
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
  })
  .strict();

export const estadoCuentaBancariaQuerySchema = z
  .object({
    cuentaBancariaId: z.coerce.number().int().positive(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
  })
  .strict();

export const reportePrevioRendicionQuerySchema = z
  .object({
    cajaId: z.coerce.number().int().positive(),
    periodoDesde: z.coerce.date(),
    periodoHasta: z.coerce.date(),
  })
  .strict()
  .refine((data) => data.periodoHasta >= data.periodoDesde, {
    message: "periodoHasta debe ser posterior o igual a periodoDesde",
    path: ["periodoHasta"],
  });
