import { z } from "zod";

export const formaPagoBancoSchema = z.enum(["DEPOSITO", "CHEQUE", "TRANSFERENCIA"]);
export const monedaMovimientoBancoSchema = z.enum(["BOB", "USD"]);
export const tipoMovimientoBancoSchema = z.enum(["INGRESO", "SALIDA_A_CAJA"]);

export const createMovimientoBancoCajaSchema = z
  .object({
    cuentaBancariaId: z.number().int().positive(),
    tipo: tipoMovimientoBancoSchema,
    cajaId: z.number().int().positive().optional(),
    fecha: z.coerce.date(),
    formaPago: formaPagoBancoSchema,
    numeroCheque: z.string().trim().optional(),
    monto: z.number().positive(),
    moneda: monedaMovimientoBancoSchema,
    depositanteNombre: z.string().trim().optional(),
    descripcion: z.string().trim().min(1),
    // Remesa que trae este ingreso (solo INGRESO): una existente del mismo
    // mes, o una nueva con la descripción del ingreso (nuevaRemesaCajaId =
    // caja de esa remesa; se puede omitir si hay una sola caja).
    presupuestoId: z.number().int().positive().optional(),
    nuevaRemesa: z.boolean().optional(),
    nuevaRemesaCajaId: z.number().int().positive().optional(),
  })
  .strict()
  .refine((data) => data.tipo === "INGRESO" || (!data.presupuestoId && !data.nuevaRemesa), {
    message: "Solo un ingreso a la cuenta se puede vincular a una remesa",
    path: ["presupuestoId"],
  })
  .refine((data) => data.tipo !== "INGRESO" || Boolean(data.presupuestoId) !== Boolean(data.nuevaRemesa), {
    message: "Todo ingreso trae una remesa: elige una del mes o crea una nueva",
    path: ["presupuestoId"],
  })
  .refine((data) => data.formaPago !== "CHEQUE" || Boolean(data.numeroCheque), {
    message: "El número de cheque es obligatorio cuando la forma de pago es CHEQUE",
    path: ["numeroCheque"],
  })
  .refine((data) => data.tipo !== "SALIDA_A_CAJA" || Boolean(data.cajaId), {
    message: "Debes elegir la caja destino cuando el movimiento es una salida hacia una caja",
    path: ["cajaId"],
  });

export const vincularPresupuestoSchema = z
  .object({
    // null = desvincular
    presupuestoId: z.number().int().positive().nullable(),
  })
  .strict();

export const remesaRapidaSchema = z
  .object({
    cajaId: z.number().int().positive().optional(),
  })
  .strict();

export const anularMovimientoBancoCajaSchema = z
  .object({
    motivo: z.string().trim().min(1),
  })
  .strict();

export const movimientoBancoCajaQuerySchema = z
  .object({
    cuentaBancariaId: z.coerce.number().int().positive().optional(),
    cajaId: z.coerce.number().int().positive().optional(),
    tipo: tipoMovimientoBancoSchema.optional(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
  })
  .strict();
