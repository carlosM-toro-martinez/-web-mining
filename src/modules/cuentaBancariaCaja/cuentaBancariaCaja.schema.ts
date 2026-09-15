import { z } from "zod";

export const monedaCajaBancariaSchema = z.enum(["BOB", "USD"]);

export const createCuentaBancariaCajaSchema = z
  .object({
    banco: z.string().trim().min(1),
    numeroCuenta: z.string().trim().optional(),
    nombreCuenta: z.string().trim().min(1),
    monedaBase: monedaCajaBancariaSchema.optional(),
    saldoInicial: z.number().min(0).optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updateCuentaBancariaCajaSchema = createCuentaBancariaCajaSchema.partial();

export const cuentaBancariaCajaQuerySchema = z
  .object({
    soloActivas: z.coerce.boolean().optional(),
  })
  .strict();
