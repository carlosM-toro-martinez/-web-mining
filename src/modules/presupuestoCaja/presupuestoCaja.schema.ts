import { z } from "zod";

export const createPresupuestoCajaSchema = z
  .object({
    cajaId: z.number().int().positive(),
    anio: z.number().int().min(2000).max(2100),
    mes: z.number().int().min(1).max(12),
    nombre: z.string().trim().min(1),
    activo: z.boolean().optional(),
  })
  .strict();

export const updatePresupuestoCajaSchema = z
  .object({
    nombre: z.string().trim().min(1).optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const presupuestoCajaQuerySchema = z
  .object({
    cajaId: z.coerce.number().int().positive().optional(),
    anio: z.coerce.number().int().optional(),
    mes: z.coerce.number().int().optional(),
    soloActivas: z.coerce.boolean().optional(),
  })
  .strict();

export const asignarBancoPresupuestoCajaSchema = z
  .object({
    cuentaBancariaId: z.number().int().positive(),
  })
  .strict();

// nombre/cajaId opcionales: si no se pasan, se usa el mismo nombre y la
// misma caja de la remesa que se está usando como plantilla.
export const duplicarPresupuestoCajaSchema = z
  .object({
    anio: z.number().int().min(2000).max(2100),
    mes: z.number().int().min(1).max(12),
    nombre: z.string().trim().min(1).optional(),
    cajaId: z.number().int().positive().optional(),
  })
  .strict();
