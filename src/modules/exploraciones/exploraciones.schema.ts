import { z } from "zod";

export const createElementoSchema = z.object({
  nombre: z.string().min(1),
  unidad: z.string().optional(),
});

export const createMuestraSchema = z.object({
  ubicacion: z.object({
    nivel: z.string().optional(),
    sector: z.string().optional(),
    galeria: z.string().optional(),
    punto: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional(),
    elevacion: z.number().optional(),
  }),
  codigo: z.string().min(1),
  numero: z.number().int().optional(),
  tipo: z.string().optional(),
  fechaMuestreo: z.string().datetime().optional(),
  fechaEntrega: z.string().datetime().optional(),
  descripcion: z.string().optional(),
  resultados: z
    .array(
      z.object({
        elemento: z.string().min(1),
        valor: z.number(),
      }),
    )
    .optional(),
  atributos: z
    .array(
      z.object({
        nombre: z.string().min(1),
        valor: z.string().min(1),
      }),
    )
    .optional(),
});

export const idSchema = z.object({
  id: z.string().uuid(),
});

export const getMuestrasQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
