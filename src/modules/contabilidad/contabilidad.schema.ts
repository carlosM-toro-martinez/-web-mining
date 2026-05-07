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
<<<<<<< HEAD
    sectorId: z.number().int().positive().optional(),
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
  })
  .strict();

export const updateCuentaContableSchema = createCuentaContableSchema.partial();

<<<<<<< HEAD
export const createSectorSchema = z
  .object({
    codigo: z.string().min(1),
    nombre: z.string().min(1),
  })
  .strict();

export const updateSectorSchema = createSectorSchema.partial();
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
