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
  })
  .strict();

export const valeQuerySchema = z
  .object({
    estado: z.enum(["PENDIENTE", "APROBADO", "PARCIAL", "COMPLETADO", "RECHAZADO"]).optional(),
    solicitanteId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
  })
  .strict();
