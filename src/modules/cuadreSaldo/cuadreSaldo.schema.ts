import { z } from "zod";

export const previsualizarCuadreSchema = z
  .object({
    cajaId: z.coerce.number().int().positive().optional(),
    cuentaBancariaId: z.coerce.number().int().positive().optional(),
    // El saldo real es el que había al EMPEZAR este día.
    fechaCorte: z.coerce.date(),
    saldoReal: z.coerce.number().optional(),
  })
  .strict();

export const createCuadreSaldoSchema = z
  .object({
    cajaId: z.number().int().positive().optional(),
    cuentaBancariaId: z.number().int().positive().optional(),
    fechaCorte: z.coerce.date(),
    saldoReal: z.number(),
    motivo: z.string().trim().min(5, "Explica de dónde sale el monto (mínimo 5 letras)"),
  })
  .strict();

export type PrevisualizarCuadreDTO = z.infer<typeof previsualizarCuadreSchema>;
export type CreateCuadreSaldoDTO = z.infer<typeof createCuadreSaldoSchema>;
