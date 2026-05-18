import { z } from "zod";

export const binCardQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 50)),
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
});

export const comprasResumenQuerySchema = z.object({
  estado: z.enum(["PENDIENTE", "PARCIAL", "COMPLETADO"]).optional(),
  proveedorId: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  fechaInicio: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  fechaFin: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 20)),
});

export const periodoQuerySchema = z.object({
  anio: z.coerce.number().int().min(2000),
  mes: z.coerce.number().int().min(1).max(12),
});

export type BinCardQueryDTO = z.infer<typeof binCardQuerySchema>;
export type StockQueryDTO = z.infer<typeof stockQuerySchema>;
export type ValesResumenQueryDTO = z.infer<typeof valesResumenQuerySchema>;
export type ComprasResumenQueryDTO = z.infer<typeof comprasResumenQuerySchema>;
export type PeriodoQueryDTO = z.infer<typeof periodoQuerySchema>;
