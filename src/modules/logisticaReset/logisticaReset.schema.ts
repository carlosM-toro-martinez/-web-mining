import { z } from "zod";

// Frase exacta como segunda barrera contra un click accidental — además
// del rol ADMIN y la confirmación que ya pide el frontend.
export const confirmarResetLogisticaSchema = z
  .object({
    confirmacion: z.literal("ELIMINAR TODO"),
  })
  .strict();
