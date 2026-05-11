import { z } from "zod";

export const createElementoSchema = z.object({
  nombre: z.string().min(1),
  simbolo: z.string().optional(),
  unidad: z.string().optional(),
  descripcion: z.string().optional(),
});

export const createMuestraSchema = z.object({
  nombre: z.string().min(1),
  sampleType: z.enum(["CHANNEL", "CHIP", "GRAB", "CORE", "SOIL", "ROCK", "OTHER"]),
  numero: z.number().int().optional(),
  laboratorio1: z.string().optional(),
  laboratorio2: z.string().optional(),
  laboratorio3: z.string().optional(),
  sector: z.string().optional(),
  fechaMuestreo: z.string().datetime().optional(),
  fechaEntrega: z.string().datetime().optional(),
  descripcion: z.string().optional(),
  ubicacion: z.object({
    miningLaborId: z.string().uuid(),
    este: z.number().optional(),
    norte: z.number().optional(),
    elevacion: z.number().optional(),
    referenciaLugar: z.string().optional(),
    estacion: z.string().optional(),
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
