import { z } from "zod";

export const binCardQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 50)),
  sinPaginar: z.string().optional().transform((val) => val === "true"),
  productoId: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  fechaInicio: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  fechaFin: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  fecha: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
});

export const stockQuerySchema = z.object({
  categoriaId: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 50)),
});

export const valesResumenQuerySchema = z.object({
  estado: z.enum(["PENDIENTE", "APROBADO", "PARCIAL", "COMPLETADO", "RECHAZADO"]).optional(),
  solicitanteId: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  fechaInicio: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  fechaFin: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 20)),
  sinPaginar: z.string().optional().transform((val) => val === "true"),
});

export const comprasResumenQuerySchema = z.object({
  estado: z.enum(["PENDIENTE", "PARCIAL", "COMPLETADO", "ANULADA"]).optional(),
  proveedorId: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  fechaInicio: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  fechaFin: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 20)),
  sinPaginar: z.string().optional().transform((val) => val === "true"),
});

export const periodoQuerySchema = z.object({
  anio: z.coerce.number().int().min(2000),
  mes: z.coerce.number().int().min(1).max(12),
});

export const periodoRangoQuerySchema = z.object({
  anioInicio: z.coerce.number().int().min(2000),
  mesInicio: z.coerce.number().int().min(1).max(12),
  anioFin: z.coerce.number().int().min(2000),
  mesFin: z.coerce.number().int().min(1).max(12),
});

export const salidasDetalleQuerySchema = z.object({
  anioInicio:          z.coerce.number().int().min(2000),
  mesInicio:           z.coerce.number().int().min(1).max(12),
  anioFin:             z.coerce.number().int().min(2000),
  mesFin:              z.coerce.number().int().min(1).max(12),
  cuentaId:            z.coerce.number().int().optional(),
  funcionGastoCodigo:  z.string().optional(),
  sectorCodigo:        z.string().optional(),
  centroCostoCodigo:   z.string().optional(),
  sinCuenta:           z.string().optional().transform(v => v === "true"),
});

export type BinCardQueryDTO = z.infer<typeof binCardQuerySchema>;
export type StockQueryDTO = z.infer<typeof stockQuerySchema>;
export type ValesResumenQueryDTO = z.infer<typeof valesResumenQuerySchema>;
export type ComprasResumenQueryDTO = z.infer<typeof comprasResumenQuerySchema>;
export type PeriodoQueryDTO = z.infer<typeof periodoQuerySchema>;
export type PeriodoRangoQueryDTO = z.infer<typeof periodoRangoQuerySchema>;
export type SalidasDetalleQueryDTO = z.infer<typeof salidasDetalleQuerySchema>;
