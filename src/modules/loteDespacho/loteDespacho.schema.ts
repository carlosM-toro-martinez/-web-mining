import { z } from "zod";

export const tipoCombustibleViajeSchema = z.enum(["CON_COMBUSTIBLE", "SIN_COMBUSTIBLE"]);

// Únicos valores válidos: el Cuadro Mensual suma el peso por nivel con
// coincidencia exacta, así que "MOSA" o "0" quedaban fuera de toda columna.
export const NIVELES_LOTE = ["La Moza", "Nivel 0", "Nivel 40", "Nivel 80"] as const;
export const nivelLoteSchema = z.enum(NIVELES_LOTE);

// Código que el ingenio le asigna al viaje en su balanza. Llega al pasar a
// "En balanza" o al registrar el pesaje, o se agrega/corrige después editando
// el lote. Vacío = sin código.
export const codigoIngenioSchema = z.string().trim().max(60);

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
    transportistaId: z.number().int().positive(),
    vehiculoId: z.number().int().positive(),
    choferId: z.number().int().positive(),
    tipoMineralId: z.number().int().positive(),
    destinoIngenioId: z.number().int().positive(),
    nivel: nivelLoteSchema,
    // Si la empresa puso el combustible de ESTE viaje o no — decide la
    // tarifa que se le aplica al liquidar (ver buscarTarifaAplicable).
    incluyeCombustible: tipoCombustibleViajeSchema.default("SIN_COMBUSTIBLE"),
    // Cuánto se le asigna al vehículo para este viaje — solo tiene sentido
    // si incluyeCombustible es CON_COMBUSTIBLE (ver refine abajo). Cuánto se
    // le entrega REALMENTE se registra después, por separado, con
    // registrarCombustibleEntregadoSchema (no siempre coincide con lo
    // asignado).
    combustibleAsignadoLitros: z.number().nonnegative().optional(),
    fechaDespachoReal: z.coerce.date(),
    fechaDocumentalFiscal: z.coerce.date().optional(),
    conocimientoFecha: z.coerce.date().optional(),
    detalleCarga: z.string().trim().min(1).optional(),
    descripcion: z.string().trim().optional(),
    observaciones: z.string().trim().optional(),
  })
  .strict()
  .refine(
    (data) => data.incluyeCombustible !== "CON_COMBUSTIBLE" || Boolean(data.combustibleAsignadoLitros),
    {
      message: "Indica cuántos litros de combustible se le asignan a este viaje",
      path: ["combustibleAsignadoLitros"],
    },
  )
  .refine((data) => data.incluyeCombustible !== "SIN_COMBUSTIBLE" || !data.combustibleAsignadoLitros, {
    message: "Un viaje sin combustible de la empresa no debe llevar litros asignados",
    path: ["combustibleAsignadoLitros"],
  });

export const registrarCombustibleEntregadoSchema = z
  .object({
    combustibleEntregadoLitros: z.number().nonnegative(),
  })
  .strict();

// Edición posterior de un lote ya creado — pensada para corregir datos
// cargados mal (a mano o por importación: municipio, transportista,
// vehículo, chofer, fecha, nivel, combustible, el pesaje si ya se
// registró...), no para repetir el flujo de creación. El correlativo y el
// año NUNCA se editan acá (son el número del documento físico). Todo
// opcional: solo se cambia lo que venga en el body.
export const updateLoteDespachoSchema = z
  .object({
    municipioOrigenId: z.number().int().positive().optional(),
    transportistaId: z.number().int().positive().optional(),
    vehiculoId: z.number().int().positive().optional(),
    choferId: z.number().int().positive().optional(),
    tipoMineralId: z.number().int().positive().optional(),
    destinoIngenioId: z.number().int().positive().optional(),
    nivel: nivelLoteSchema.nullable().optional(),
    codigoIngenio: codigoIngenioSchema.nullable().optional(),
    incluyeCombustible: tipoCombustibleViajeSchema.optional(),
    combustibleAsignadoLitros: z.number().nonnegative().nullable().optional(),
    fechaDespachoReal: z.coerce.date().optional(),
    fechaDocumentalFiscal: z.coerce.date().optional(),
    // N° del Conocimiento dentro de su mes (el "27" de "27/10"): para
    // corregir la serie a mano. Ver asignarCorrelativoLoteManual.
    numeroCorrelativo: z.number().int().positive().optional(),
    detalleCarga: z.string().trim().min(1).optional(),
    descripcion: z.string().trim().nullable().optional(),
    observaciones: z.string().trim().nullable().optional(),
    // Solo se aplican si el lote YA tiene un pesaje registrado. Si no se
    // manda el neto, se recalcula como bruto − tara; si se manda, se guarda
    // ese (el ticket de balanza a veces difiere en algún decimal).
    // Si todavía no tiene pesaje, usar "Registrar pesaje" en su lugar.
    tonelajeBruto: z.number().positive().optional(),
    tonelajeTara: z.number().nonnegative().optional(),
    tonelajeNeto: z.number().positive().optional(),
  })
  .strict();

export const loteDespachoQuerySchema = z
  .object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    estadoLote: estadoLoteDespachoSchema.optional(),
    municipioOrigenId: z.coerce.number().int().positive().optional(),
    transportistaId: z.coerce.number().int().positive().optional(),
    vehiculoId: z.coerce.number().int().positive().optional(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
    // Búsqueda libre por correlativo (lote/Conocimiento), transportista,
    // placa o código de Formulario 101 — se aplica en el servidor ANTES de
    // paginar, para que un resultado en cualquier página aparezca sin
    // importar en qué página de la lista esté (si se filtrara solo la
    // página ya cargada en el navegador, un match en otra página no
    // aparecería nunca).
    search: z.string().trim().min(1).optional(),
    conObservaciones: z.coerce.boolean().optional(),
    // SIN_ENTREGA = con combustible de la empresa pero sin litros entregados registrados.
    combustible: z.enum(["CON_COMBUSTIBLE", "SIN_COMBUSTIBLE", "SIN_ENTREGA"]).optional(),
    f101: z.enum(["CON", "SIN"]).optional(),
    pesaje: z.enum(["CON", "SIN"]).optional(),
    // Con o sin código de ingenio anotado.
    codigoIngenio: z.enum(["CON", "SIN"]).optional(),
    nivel: z.union([nivelLoteSchema, z.literal("SIN_NIVEL")]).optional(),
  })
  .strict();

export const avanzarEstadoLoteSchema = z
  .object({
    estado: z.enum(["EN_TRANSITO", "EN_BALANZA"]),
    // Solo se usa al pasar a EN_BALANZA (el ingenio lo asigna en su balanza).
    codigoIngenio: codigoIngenioSchema.optional(),
  })
  .strict();

export const corregirEstadoLoteSchema = z
  .object({
    estado: z.enum(["EN_TRANSITO", "EN_BALANZA"]),
    motivo: z.string().trim().min(5, "El motivo debe tener al menos 5 caracteres"),
  })
  .strict();

export const registrarPesajeSchema = z
  .object({
    tonelajeBruto: z.number().positive(),
    tonelajeTara: z.number().nonnegative(),
    // Opcional: si no viene, se calcula bruto − tara. Si viene, se guarda
    // tal cual (redondeado a 3 decimales) porque el ticket de balanza a
    // veces difiere del cálculo en algún decimal.
    tonelajeNeto: z.number().positive().optional(),
    observaciones: z.string().trim().optional(),
    // Si no se anotó al pasar a balanza, se puede anotar aquí.
    codigoIngenio: codigoIngenioSchema.optional(),
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
