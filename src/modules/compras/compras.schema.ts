import { z } from "zod";

export const TIPOS_DOCUMENTO_COMPRA = ["FACTURA", "RECIBO", "SIN_DOCUMENTO"] as const;

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
          totalBs: z.number().positive().optional(),
        }).refine(
          (d) => d.productoId !== undefined || d.productoCodigo !== undefined,
          { message: "Se requiere productoId o productoCodigo en cada item" },
        ),
      )
      .min(1),
    observacion: z.string().optional(),
    fechaOperacion: z.coerce.date().optional(),
    numeroFactura: z.string().min(1).optional(),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO_COMPRA).optional(),
    tieneIva: z.boolean().optional(),
    esGasEspecial: z.boolean().optional().nullable(),
  })
  .strict();

export const recibirCompraSchema = z
  .object({
    cantidadesRecibidas: z.record(z.string(), z.number().nonnegative()),
  })
  .strict();

// Registrar o cambiar el documento de una compra. FACTURA y RECIBO llevan número;
// SIN_DOCUMENTO se usa cuando se confirmó que no hay documento.
export const documentoCompraSchema = z
  .object({
    tipoDocumento: z.enum(TIPOS_DOCUMENTO_COMPRA),
    numeroFactura: z.string().trim().optional(),
  })
  .strict()
  .refine(
    (d) => d.tipoDocumento === "SIN_DOCUMENTO" || (d.numeroFactura ?? "").length > 0,
    { message: "La factura o el recibo necesitan su número", path: ["numeroFactura"] },
  );

export const corregirPrecioItemSchema = z.object({
  precioUnit: z.number().positive().optional(),
  totalBs: z.number().positive().optional(),
  observacion: z.string().optional(),
}).strict().refine(
  (d) => d.precioUnit !== undefined || d.totalBs !== undefined,
  { message: "Se requiere precioUnit o totalBs" },
);

export const compraQuerySchema = z
  .object({
    estado: z.enum(["PENDIENTE", "PARCIAL", "COMPLETADO", "ANULADA"]).optional(),
    // Solo lo que falta recibir (PENDIENTE y PARCIAL)
    pendientes: z.string().optional().transform((v) => v === "true"),
    // PENDIENTE = todavía sin documento registrado (excluye anuladas)
    documento: z.enum(["FACTURA", "RECIBO", "SIN_DOCUMENTO", "PENDIENTE"]).optional(),
    // Texto libre: proveedor, número de documento, observación o producto
    busqueda: z.string().trim().min(1).optional(),
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
