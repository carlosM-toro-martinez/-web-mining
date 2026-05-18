import { z } from "zod";

export const createPedidoSchema = z
  .object({
    proveedorId: z.number().int().positive(),
    observacion: z.string().optional(),
    items: z
      .array(
        z.object({
          productoId: z.number().int().positive(),
          cantidadPedida: z.number().positive(),
        }),
      )
      .min(1),
  })
  .strict();

export const pedidoQuerySchema = z.object({
  estado: z.enum(["PENDIENTE", "PARCIAL", "COMPLETADO"]).optional(),
  proveedorId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
