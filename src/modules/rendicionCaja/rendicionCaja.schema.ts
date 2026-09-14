import { z } from "zod";

export const estadoRendicionCajaSchema = z.enum(["BORRADOR", "CERRADO", "ANULADO"]);

export const createRendicionCajaSchema = z
  .object({
    cajaId: z.number().int().positive(),
    periodoDesde: z.coerce.date(),
    periodoHasta: z.coerce.date(),
    tipoCambio: z.number().positive(),
  })
  .strict()
  .refine((data) => data.periodoHasta >= data.periodoDesde, {
    message: "periodoHasta debe ser posterior o igual a periodoDesde",
    path: ["periodoHasta"],
  });

export const rendicionCajaQuerySchema = z
  .object({
    cajaId: z.coerce.number().int().positive().optional(),
    estado: estadoRendicionCajaSchema.optional(),
  })
  .strict();

export const anularRendicionCajaSchema = z
  .object({
    motivo: z.string().trim().min(1),
  })
  .strict();
