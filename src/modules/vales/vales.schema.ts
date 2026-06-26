import { z } from "zod";

export const createValeSchema = z
  .object({
    solicitanteId: z.number().int().positive(),
    items: z
      .array(
        z.object({
          productoId: z.number().int().positive(),
          cantidadSolicitada: z.number().positive(),
        }),
      )
      .min(1),
    fechaOperacion: z.coerce.date().optional(),
  })
  .strict();

export const aprobarValeSchema = z
  .object({
    superintendenteId: z.number().int().positive(),
  })
  .strict();

export const entregarValeSchema = z
  .object({
    cantidadesEntregadas: z.record(z.string(), z.number().nonnegative()),
    cuentaIds: z.record(z.string(), z.number().int().positive()).optional(),
  })
  .strict();

export const valeQuerySchema = z
  .object({
    estado: z.enum(["PENDIENTE", "APROBADO", "PARCIAL", "COMPLETADO", "RECHAZADO", "ANULADO"]).optional(),
    solicitanteId: z.coerce.number().int().positive().optional(),
    // Filtro por rango de fechas (usa fechaOperacion con fallback a createdAt)
    fechaInicio: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
    fechaFin:    z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
    // Filtro por mes exacto
    anio: z.coerce.number().int().min(2000).optional(),
    mes:  z.coerce.number().int().min(1).max(12).optional(),
    page:  z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    sinPaginar: z.string().optional().transform((v) => v === "true"),
  })
  .strict();
