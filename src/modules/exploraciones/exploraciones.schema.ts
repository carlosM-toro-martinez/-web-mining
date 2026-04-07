import { z } from "zod";

export const createElementoSchema = z.object({
  nombre: z.string().min(1),
  unidad: z.string().optional(),
});

export const createMuestraSchema = z.object({
  nombre: z.string().min(1),
  numero: z.number().int().optional(),
  laboratorio1: z.string().optional(),
  laboratorio2: z.string().optional(),
  laboratorio3: z.string().optional(),
  tipoMuestra: z.string().optional(),
  sector: z.string().optional(),
  fechaMuestreo: z.string().datetime().optional(),
  fechaEntrega: z.string().datetime().optional(),
  descripcion: z.string().optional(),
  ubicacion: z.object({
    nivel: z.string().min(1),
    este: z.number().optional(),
    norte: z.number().optional(),
    elevacion: z.number().optional(),
    referenciaLugar: z.string().optional(),
  }),
  resultados: z
    .array(
      z.object({
        elemento: z.string().min(1),
        valor: z.number(),
        prefijo: z.enum(["<", ">", "~", "="]).optional(),
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
