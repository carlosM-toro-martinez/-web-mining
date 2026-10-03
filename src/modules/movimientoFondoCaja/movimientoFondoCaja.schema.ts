import { TipoMovimientoFondoCaja } from "@prisma/client";
import { z } from "zod";

// z.nativeEnum en vez de una lista de strings a mano — la misma clase de
// bug que el registro de usuarios (ver auth.schema.ts): si se agrega un
// tipo nuevo al enum de Prisma y se olvida tocar esto, el registro
// manual de un fondo de ese tipo fallaría con 400 aunque el valor ya
// exista en la base de datos.
export const tipoMovimientoFondoCajaSchema = z.nativeEnum(TipoMovimientoFondoCaja);
export const monedaCajaSchema = z.enum(["BOB", "USD"]);

export const createMovimientoFondoCajaSchema = z
  .object({
    cajaId: z.number().int().positive(),
    tipo: tipoMovimientoFondoCajaSchema,
    monto: z.number().positive(),
    moneda: monedaCajaSchema,
    fecha: z.coerce.date(),
    referencia: z.string().optional(),
  })
  .strict();

export const movimientoFondoCajaQuerySchema = z
  .object({
    cajaId: z.coerce.number().int().positive().optional(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
  })
  .strict();
