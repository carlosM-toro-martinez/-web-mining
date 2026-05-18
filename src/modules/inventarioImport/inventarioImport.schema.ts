import { z } from "zod";

export const stockInicialSchema = z.object({
  items: z
    .array(
      z.object({
        productoCodigo: z.string().min(1),
        cantidad: z.number().nonnegative(),
        precioUnit: z.number().nonnegative(),
      }),
    )
    .min(1),
});

export const saldoMensualSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  items: z
    .array(
      z.object({
        productoCodigo: z.string().min(1),
        saldoInicial: z.number().nonnegative(),
        ingresoQty: z.number().nonnegative(),
        salidaQty: z.number().nonnegative(),
        saldoFinal: z.number().nonnegative(),
        precioUnit: z.number().nonnegative(),
      }),
    )
    .min(1),
});

export const saldoMensualQuerySchema = z.object({
  anio: z.coerce.number().int().min(2000),
  mes: z.coerce.number().int().min(1).max(12),
});
