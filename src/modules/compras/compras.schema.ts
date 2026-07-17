import { z } from "zod";

export const createCompraSchema = z
  .object({
    proveedorId: z.number().int().positive(),
    items: z
      .array(
        z.object({
          productoId: z.number().int().positive().optional(),
          productoCodigo: z.string().min(1).optional(),
          cantidadPedida: z.number().positive(),
          precioUnit: z.number().positive(),
        }).refine(
          (d) => d.productoId !== undefined || d.productoCodigo !== undefined,
          { message: "Se requiere productoId o productoCodigo en cada item" },
        ),
      )
      .min(1),
    observacion: z.string().optional(),
    fechaOperacion: z.coerce.date().optional(),
    numeroFactura: z.string().min(1).optional(),
    tieneIva: z.boolean().optional(),
  })
  .strict();

export const recibirCompraSchema = z
  .object({
    cantidadesRecibidas: z.record(z.string(), z.number().nonnegative()),
  })
  .strict();

export const corregirPrecioItemSchema = z.object({
  precioUnit: z.number().positive(),
  observacion: z.string().optional(),
}).strict();

export const compraQuerySchema = z
  .object({
    estado: z.enum(["PENDIENTE", "PARCIAL", "COMPLETADO", "ANULADA"]).optional(),
    proveedorId: z.coerce.number().int().positive().optional(),
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
