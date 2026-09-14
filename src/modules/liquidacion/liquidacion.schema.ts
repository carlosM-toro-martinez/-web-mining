import { z } from "zod";

export const tipoPeriodoLiquidacionSchema = z.enum(["SEMANAL", "MENSUAL"]);
export const estadoLiquidacionSchema = z.enum(["BORRADOR", "CERRADO", "ANULADO"]);

export const createLiquidacionSchema = z
  .object({
    remitenteId: z.number().int().positive(),
    tipoPeriodo: tipoPeriodoLiquidacionSchema,
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
  })
  .strict()
  .refine((data) => data.fechaFin >= data.fechaInicio, {
    message: "La fecha fin debe ser posterior o igual a la fecha inicio",
    path: ["fechaFin"],
  });

export const liquidacionQuerySchema = z
  .object({
    remitenteId: z.coerce.number().int().positive().optional(),
    estado: estadoLiquidacionSchema.optional(),
  })
  .strict();

export const agregarItemConceptoSchema = z
  .object({
    conceptoId: z.number().int().positive(),
    monto: z.number().positive(),
    descripcion: z.string().trim().optional(),
  })
  .strict();

export const anularLiquidacionSchema = z
  .object({
    motivo: z.string().trim().min(1),
  })
  .strict();
