import { z } from "zod";

export const EMPRESA_SOLICITUDES = "MARTE";

export const TIPOS_FIRMA = ["ELABORADO", "REVISADO", "VISTO_BUENO", "ADMINISTRADOR"] as const;
export const TIPOS_DOCUMENTO = ["FACTURA", "RECIBO", "SIN_DOCUMENTO"] as const;

const textoOpcional = z.string().trim().max(2000).optional().nullable();

export const itemSolicitudSchema = z.object({
  referencia: z.string().trim().max(40).optional().nullable(),
  descripcion: z.string().trim().min(1, "Cada ítem necesita su descripción").max(2000),
  cantidad: z.number().positive("La cantidad debe ser mayor a cero").default(1),
  precioUnit: z.number().min(0, "El precio no puede ser negativo"),
  descuento: z.number().min(0, "El descuento no puede ser negativo").default(0),
});

// Nombre y cargo que se imprimen bajo cada firma del formulario
const firmaTextoSchema = z.object({
  nombre: z.string().trim().max(120).default(""),
  cargo: z.string().trim().max(120).optional().nullable(),
});

const firmasTextoSchema = z
  .object({
    ELABORADO: firmaTextoSchema.optional(),
    REVISADO: firmaTextoSchema.optional(),
    VISTO_BUENO: firmaTextoSchema.optional(),
    ADMINISTRADOR: firmaTextoSchema.optional(),
  })
  .strict();

const baseSolicitud = {
  fecha: z.coerce.date(),
  solicitadoPor: z.string().trim().max(200).default(""),
  cotizacion: z.string().trim().max(120).optional().nullable(),
  informeUso: textoOpcional,
  observaciones: textoOpcional,
  proveedorId: z.number().int().positive().optional().nullable(),
  compraId: z.string().min(1).optional().nullable(),
  beneficiarioNombre: z.string().trim().min(1, "El beneficiario es obligatorio").max(200),
  beneficiarioNit: z.string().trim().max(60).optional().nullable(),
  banco: z.string().trim().max(120).optional().nullable(),
  cuenta: z.string().trim().max(80).optional().nullable(),
  items: z.array(itemSolicitudSchema).min(1, "Agrega al menos un ítem"),
  firmas: firmasTextoSchema.optional(),
  tipoDocumento: z.enum(TIPOS_DOCUMENTO).optional().nullable(),
  numeroFactura: z.string().trim().max(120).optional().nullable(),
  estadoEntrega: z.enum(["PENDIENTE", "EN_EJECUCION", "COMPLETADO"]).optional(),
  notaEntrega: textoOpcional,
};

export const createSolicitudSchema = z
  .object({
    ...baseSolicitud,
    // Solo para cargar solicitudes antiguas con su número original; normalmente se asigna solo
    numero: z.number().int().positive().optional(),
  })
  .strict();

export const updateSolicitudSchema = z.object(baseSolicitud).strict();

// Factura de lo que se pagó: FACTURA y RECIBO llevan número; null = todavía sin documento
export const facturaSolicitudSchema = z
  .object({
    tipoDocumento: z.enum(TIPOS_DOCUMENTO).nullable(),
    numeroFactura: z.string().trim().max(120).optional().nullable(),
  })
  .strict()
  .refine((d) => d.tipoDocumento !== "FACTURA" && d.tipoDocumento !== "RECIBO" ? true : (d.numeroFactura ?? "").length > 0, {
    message: "La factura o el recibo necesitan su número",
    path: ["numeroFactura"],
  });

export const entregaSolicitudSchema = z
  .object({
    estadoEntrega: z.enum(["PENDIENTE", "EN_EJECUCION", "COMPLETADO"]),
    notaEntrega: textoOpcional,
  })
  .strict();

export const pagarSolicitudSchema = z
  .object({
    fechaPago: z.coerce.date(),
    referenciaPago: z.string().trim().max(120).optional().nullable(),
  })
  .strict();

export const anularSolicitudSchema = z
  .object({ motivo: z.string().trim().min(3, "Escribe el motivo de la anulación").max(500) })
  .strict();

export const tipoFirmaParamSchema = z.object({
  id: z.string().min(1),
  tipo: z.enum(["REVISADO", "VISTO_BUENO", "ADMINISTRADOR"]),
});

export const solicitudQuerySchema = z
  .object({
    anio: z.coerce.number().int().min(2000).max(2100).optional(),
    mes: z.coerce.number().int().min(1).max(12).optional(),
    estado: z.enum(["BORRADOR", "SOLICITADA", "PAGADA", "ANULADA"]).optional(),
    // PENDIENTE = todavía sin factura ni recibo (excluye las anuladas)
    factura: z.enum(["PENDIENTE", ...TIPOS_DOCUMENTO]).optional(),
    entrega: z.enum(["PENDIENTE", "EN_EJECUCION", "COMPLETADO"]).optional(),
    busqueda: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    sinPaginar: z.string().optional().transform((v) => v === "true"),
  })
  .strict();

export const beneficiarioQuerySchema = z.object({ search: z.string().trim().optional() }).strict();

export const defaultsQuerySchema = z
  .object({
    anio: z.coerce.number().int().min(2000).max(2100),
    mes: z.coerce.number().int().min(1).max(12),
  })
  .strict();
