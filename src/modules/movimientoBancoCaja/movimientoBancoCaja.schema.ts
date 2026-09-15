import { z } from "zod";

export const formaPagoBancoSchema = z.enum(["DEPOSITO", "CHEQUE", "TRANSFERENCIA"]);
export const monedaMovimientoBancoSchema = z.enum(["BOB", "USD"]);
export const tipoMovimientoBancoSchema = z.enum(["INGRESO", "SALIDA_A_CAJA"]);

export const createMovimientoBancoCajaSchema = z
  .object({
    cuentaBancariaId: z.number().int().positive(),
    tipo: tipoMovimientoBancoSchema,
    cajaId: z.number().int().positive().optional(),
    partidaPresupuestoId: z.number().int().positive().optional(),
    fecha: z.coerce.date(),
    formaPago: formaPagoBancoSchema,
    numeroCheque: z.string().trim().optional(),
    monto: z.number().positive(),
    moneda: monedaMovimientoBancoSchema,
    depositanteNombre: z.string().trim().optional(),
    descripcion: z.string().trim().min(1),
  })
  .strict()
  .refine((data) => data.formaPago !== "CHEQUE" || Boolean(data.numeroCheque), {
    message: "El número de cheque es obligatorio cuando la forma de pago es CHEQUE",
    path: ["numeroCheque"],
  })
  .refine((data) => data.tipo !== "SALIDA_A_CAJA" || Boolean(data.cajaId), {
    message: "Debes elegir la caja destino cuando el movimiento es una salida hacia una caja",
    path: ["cajaId"],
  });

export const movimientoBancoCajaQuerySchema = z
  .object({
    cuentaBancariaId: z.coerce.number().int().positive().optional(),
    cajaId: z.coerce.number().int().positive().optional(),
    tipo: tipoMovimientoBancoSchema.optional(),
    partidaPresupuestoId: z.coerce.number().int().positive().optional(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
  })
  .strict();
