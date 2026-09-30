import { z } from "zod";

export const tipoPeriodoLiquidacionSchema = z.enum(["SEMANAL", "MENSUAL"]);
export const estadoLiquidacionSchema = z.enum(["BORRADOR", "CERRADO", "ANULADO"]);

export const createLiquidacionSchema = z
  .object({
    transportistaId: z.number().int().positive(),
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
    transportistaId: z.coerce.number().int().positive().optional(),
    estado: estadoLiquidacionSchema.optional(),
  })
  .strict();

// Vista previa (sin persistir nada): mismo rango que se usaría para crear
// la liquidación, para que el usuario vea qué lotes y cuánto se le va a
// pagar a un transportista ANTES de comprometerse a crear/cerrar nada.
export const previewLiquidacionQuerySchema = z
  .object({
    transportistaId: z.coerce.number().int().positive(),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
  })
  .strict()
  .refine((data) => data.fechaFin >= data.fechaInicio, {
    message: "La fecha fin debe ser posterior o igual a la fecha inicio",
    path: ["fechaFin"],
  });

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

// El Comprobante de Egresos de una liquidación paga a un transportista, no
// a un gasto de Caja Chica — acá no hay motor tributario ni cuenta
// contable resuelta de antemano (Logística no maneja ese catálogo), así
// que las dos cuentas del asiento (DEBE y HABER) se piden a mano cada vez
// que se genera, en vez de quedar fijas en la liquidación.
export const comprobanteEgresoLiquidacionSchema = z
  .object({
    cuentaDebeCodigo: z.string().trim().min(1, "El código de la cuenta a debitar es obligatorio."),
    cuentaDebeNombre: z.string().trim().min(1, "El nombre de la cuenta a debitar es obligatorio."),
    cuentaHaberCodigo: z.string().trim().min(1, "El código de la cuenta a acreditar es obligatorio."),
    cuentaHaberNombre: z.string().trim().min(1, "El nombre de la cuenta a acreditar es obligatorio."),
  })
  .strict();
