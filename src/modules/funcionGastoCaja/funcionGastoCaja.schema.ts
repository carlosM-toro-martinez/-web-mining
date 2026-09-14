import { z } from "zod";

export const tipoCosteoCajaSchema = z.enum(["DISTRIBUIBLE", "NO_DISTRIBUIBLE"]);

export const createFuncionGastoCajaSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
    tipo: tipoCosteoCajaSchema,
    parentId: z.number().int().positive().nullish(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateFuncionGastoCajaSchema = createFuncionGastoCajaSchema.partial();

export const funcionGastoCajaQuerySchema = z
  .object({
    search: z.string().optional(),
    soloRaices: z.coerce.boolean().optional(),
    soloActivos: z.coerce.boolean().optional(),
  })
  .strict();
