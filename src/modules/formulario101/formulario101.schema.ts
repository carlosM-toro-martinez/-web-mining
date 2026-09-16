import { z } from "zod";

export const estadoFormulario101Schema = z.enum(["DISPONIBLE", "VINCULADO", "ANULADO"]);

// Vincula un Formulario 101 recién emitido a un lote que todavía no tiene
// uno. La fecha debe coincidir sí o sí con la fecha del Conocimiento de
// ese lote (se valida en el service).
export const vincularFormulario101Schema = z
  .object({
    codigo: z.string().trim().min(1),
    fecha: z.coerce.date(),
  })
  .strict();

// Reutiliza un Formulario 101 ya emitido y DISPONIBLE (no usado en su
// lote original, o liberado por algún problema) hacia un lote distinto.
export const reutilizarFormulario101Schema = z
  .object({
    loteId: z.string().uuid(),
  })
  .strict();

export const anularFormulario101Schema = z
  .object({
    motivo: z.string().trim().min(1),
  })
  .strict();

export const formulario101QuerySchema = z
  .object({
    estado: estadoFormulario101Schema.optional(),
    loteId: z.string().uuid().optional(),
  })
  .strict();
