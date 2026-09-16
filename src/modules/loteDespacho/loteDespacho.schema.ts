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

// El Conocimiento se crea siempre junto con el lote (un lote = un
// conocimiento). "detalleCarga" es el campo "Con: ..." del formulario real
// (por defecto "Carga Chami", editable); "fecha" es la fecha propia del
// documento (debe coincidir con la del Formulario 101 que se vincule
// después) — si no se manda, se usa la misma fechaDespachoReal.
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
    conocimientoFecha: z.coerce.date().optional(),
    detalleCarga: z.string().trim().min(1).optional(),
    descripcion: z.string().trim().optional(),
    observaciones: z.string().trim().optional(),
  })
  .strict();

export const loteDespachoQuerySchema = z
  .object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    estadoLote: estadoLoteDespachoSchema.optional(),
    municipioOrigenId: z.coerce.number().int().positive().optional(),
    remitenteId: z.coerce.number().int().positive().optional(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
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
    observaciones: z.string().trim().optional(),
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

// Transbordo: la volqueta original sufre una falla mecánica a mitad de
// camino y otra completa el traslado — es el MISMO lote (mismo
// Conocimiento y Formulario 101), solo cambia qué vehículo/chofer lo
// completa.
export const transbordarLoteSchema = z
  .object({
    vehiculoNuevoId: z.number().int().positive(),
    choferNuevoId: z.number().int().positive().optional(),
    motivo: z.string().trim().min(1),
  })
  .strict();
