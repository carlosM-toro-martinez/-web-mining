import { z } from "zod";

export const createSalidaSchema = z
  .object({
    productoId: z.number().int().positive(),
    cantidad: z.number().positive(),
<<<<<<< HEAD
    cuentaId: z.number().int().positive().optional(),
    usuarioEntregaId: z.number().int().positive(),
    usuarioRecibidoId: z.number().int().positive(),
=======
    cuentaId: z.number().int().positive(),
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
    referencia: z.string().min(1).optional(),
    referenciaId: z.string().min(1).optional(),
  })
  .strict();

<<<<<<< HEAD
export const createEntradaSchema = z
  .object({
    productoId: z.number().int().positive(),
    cantidad: z.number().positive(),
    precioUnit: z.number().positive(),
    cuentaId: z.number().int().positive().optional(),
    usuarioEntregaId: z.number().int().positive(),
    usuarioRecibidoId: z.number().int().positive(),
    referencia: z.string().min(1).optional(),
    referenciaId: z.string().min(1).optional(),
  })
  .strict();
=======
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
