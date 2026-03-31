import { z } from "zod";

export const createSalidaSchema = z
  .object({
    productoId: z.number().int().positive(),
    cantidad: z.number().positive(),
    cuentaId: z.number().int().positive(),
    referencia: z.string().min(1).optional(),
    referenciaId: z.string().min(1).optional(),
  })
  .strict();

