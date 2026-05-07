import { z } from "zod";

export const createCompraSchema = z
  .object({
    proveedorId: z.number().int().positive(),
    items: z
      .array(
        z.object({
          productoId: z.number().int().positive(),
          cantidadPedida: z.number().positive(),
          precioUnit: z.number().positive(),
        }),
      )
      .min(1),
    observacion: z.string().optional(),
  })
  .strict();

export const recibirCompraSchema = z
  .object({
    cantidadesRecibidas: z.record(z.string(), z.number().nonnegative()),
  })
  .strict();

export const compraQuerySchema = z
  .object({
    estado: z.enum(["PENDIENTE", "PARCIAL", "COMPLETADO"]).optional(),
    proveedorId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
  })
  .strict();
