import { z } from "zod";

export const estadoLoteDespachoSchema = z.enum([
  "REGISTRADO",
  "EN_TRANSITO",
  "EN_BALANZA",
  "PESADO",
  "ACOPIADO",
  "LIQUIDADO",
  "ANULADO",
]);

export const estadoFormulario101Schema = z.enum(["PENDIENTE", "REGULARIZADO"]);

export const createLoteDespachoSchema = z
  .object({
    municipioOrigenId: z.number().int().positive(),
    remitenteId: z.number().int().positive(),
    vehiculoId: z.number().int().positive(),
    choferId: z.number().int().positive(),
    tipoMineralId: z.number().int().positive(),
    destinoIngenioId: z.number().int().positive(),
    nivel: z.string().trim().optional(),
    fechaDespachoReal: z.coerce.date(),
    fechaDocumentalFiscal: z.coerce.date().optional(),
    codigoFormulario101: z.string().trim().optional(),
  })
  .strict();

export const loteDespachoQuerySchema = z
  .object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    estadoLote: estadoLoteDespachoSchema.optional(),
    estadoFormulario101: estadoFormulario101Schema.optional(),
    municipioOrigenId: z.coerce.number().int().positive().optional(),
    remitenteId: z.coerce.number().int().positive().optional(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
  })
  .strict();

export const regularizarFormulario101Schema = z
  .object({
    codigoFormulario101: z.string().trim().min(1),
  })
  .strict();

export const avanzarEstadoLoteSchema = z
  .object({
    estado: z.enum(["EN_TRANSITO", "EN_BALANZA"]),
  })
  .strict();

export const registrarPesajeSchema = z
  .object({
    tonelajeBruto: z.number().positive(),
    tonelajeTara: z.number().nonnegative(),
  })
  .strict()
  .refine((data) => data.tonelajeBruto > data.tonelajeTara, {
    message: "El tonelaje bruto debe ser mayor al tara",
    path: ["tonelajeBruto"],
  });

export const anularLoteSchema = z
  .object({
    motivo: z.string().trim().min(1),
  })
  .strict();
