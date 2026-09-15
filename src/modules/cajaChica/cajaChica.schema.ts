import { z } from "zod";

export const monedaCajaSchema = z.enum(["BOB", "USD"]);

export const createCajaChicaSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
    monedaBase: monedaCajaSchema.optional(),
    saldoInicial: z.number().min(0).optional(),
    encargadoNombre: z.string().optional(),
    encargadoUsuarioId: z.number().int().positive().nullish(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateCajaChicaSchema = createCajaChicaSchema.partial();

export const cajaChicaQuerySchema = z
  .object({
    search: z.string().optional(),
    soloActivas: z.coerce.boolean().optional(),
  })
  .strict();
