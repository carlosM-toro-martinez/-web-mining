import { z } from "zod";

export const binCardQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 50)),
  productoId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
  fechaInicio: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  fechaFin: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  fecha: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export type BinCardQueryDTO = z.infer<typeof binCardQuerySchema>;
