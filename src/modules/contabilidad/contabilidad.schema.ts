import { z } from "zod";

export const createCentroCostoSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
  })
  .strict();

export const updateCentroCostoSchema = createCentroCostoSchema.partial();

export const createFuncionGastoSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
  })
  .strict();

export const updateFuncionGastoSchema = createFuncionGastoSchema.partial();

export const createCuentaContableSchema = z
  .object({
    codigoCompleto: z.string().min(1),
    centroCostoId: z.number().int().positive(),
    funcionGastoId: z.number().int().positive(),
  })
  .strict();

export const updateCuentaContableSchema = createCuentaContableSchema.partial();

