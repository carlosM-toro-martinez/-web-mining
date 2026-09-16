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

// Consulta de solo lectura para "previsualizar" una rendición antes de
// crearla de verdad: mismos filtros que create(), pero sin folio ni gastos
// obligatorios (útil mientras el usuario todavía está eligiendo el rango).
export const previewRendicionCajaQuerySchema = z
  .object({
    cajaId: z.coerce.number().int().positive(),
    periodoDesde: z.coerce.date(),
    periodoHasta: z.coerce.date(),
  })
  .strict();

export const anularRendicionCajaSchema = z
  .object({
    motivo: z.string().trim().min(1),
  })
  .strict();
