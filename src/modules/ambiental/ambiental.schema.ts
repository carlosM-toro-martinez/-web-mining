import { z } from "zod";

export const tipoPuntoValues   = ["HIDRICO", "SUELO", "RUIDO", "RESIDUOS", "POZO_SEPTICO", "GENERAL"] as const;
export const calidadAguaValues = ["EXCELENTE", "BUENA", "REGULAR", "MALA", "CRITICA"] as const;
export const tipoResiduoValues = ["SOLIDO_PELIGROSO", "SOLIDO_NO_PELIGROSO", "LIQUIDO_PELIGROSO", "LIQUIDO_NO_PELIGROSO"] as const;
export const estadoInfraValues = ["BUENO", "REGULAR", "MALO", "CRITICO"] as const;

// ── PuntoMonitoreo ─────────────────────────────────────────────────────────

export const crearPuntoSchema = z.object({
  nombre:      z.string().min(1).max(100),
  descripcion: z.string().max(500).optional(),
  latitud:     z.number().min(-90).max(90),
  longitud:    z.number().min(-180).max(180),
  tipo:        z.enum(tipoPuntoValues).default("GENERAL"),
}).strict();

export const actualizarPuntoSchema = z.object({
  nombre:      z.string().min(1).max(100).optional(),
  descripcion: z.string().max(500).optional(),
  latitud:     z.number().min(-90).max(90).optional(),
  longitud:    z.number().min(-180).max(180).optional(),
  tipo:        z.enum(tipoPuntoValues).optional(),
  activo:      z.boolean().optional(),
}).strict().refine(d => Object.keys(d).length > 0, { message: "Debe enviar al menos un campo" });

export const puntosQuerySchema = z.object({
  tipo:   z.enum(tipoPuntoValues).optional(),
  activo: z.string().optional().transform(v => v === "false" ? false : true),
});

// ── RegistroHidrico ────────────────────────────────────────────────────────

export const crearRegistroHidricoSchema = z.object({
  puntoId:           z.number().int().positive(),
  fecha:             z.string().datetime(),
  ph:                z.number().min(0).max(14).optional(),
  turbidez:          z.number().min(0).optional(),
  conductividad:     z.number().min(0).optional(),
  oxigenoDisuelto:   z.number().min(0).optional(),
  temperatura:       z.number().optional(),
  coliformesFecales: z.number().min(0).optional(),
  calidadAgua:       z.enum(calidadAguaValues).default("BUENA"),
  observaciones:     z.string().max(1000).optional(),
}).strict();

export const registrosHidricosQuerySchema = z.object({
  puntoId: z.coerce.number().int().positive().optional(),
  desde:   z.string().optional(),
  hasta:   z.string().optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(200).default(20),
});

// ── RegistroResiduo ────────────────────────────────────────────────────────

export const crearRegistroResiduoSchema = z.object({
  puntoId:       z.number().int().positive().optional(),
  fecha:         z.string().datetime(),
  tipoResiduo:   z.enum(tipoResiduoValues),
  cantidad:      z.number().positive(),
  unidad:        z.string().min(1).max(20),
  disposicion:   z.string().min(1).max(500),
  empresa:       z.string().max(200).optional(),
  manifiestoNum: z.string().max(50).optional(),
  observaciones: z.string().max(1000).optional(),
}).strict();

export const registrosResiduoQuerySchema = z.object({
  puntoId:     z.coerce.number().int().positive().optional(),
  tipoResiduo: z.enum(tipoResiduoValues).optional(),
  desde:       z.string().optional(),
  hasta:       z.string().optional(),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(200).default(20),
});

// ── RegistroRuido ──────────────────────────────────────────────────────────

export const crearRegistroRuidoSchema = z.object({
  puntoId:         z.number().int().positive(),
  fecha:           z.string().datetime(),
  nivelRuido:      z.number().min(0).max(200),
  limitePermitido: z.number().min(0).max(200).optional(),
  particulasPm10:  z.number().min(0).optional(),
  particulasPm25:  z.number().min(0).optional(),
  observaciones:   z.string().max(1000).optional(),
}).strict();

export const registrosRuidoQuerySchema = z.object({
  puntoId: z.coerce.number().int().positive().optional(),
  desde:   z.string().optional(),
  hasta:   z.string().optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(200).default(20),
});

// ── RegistroSuelo ──────────────────────────────────────────────────────────

export const crearRegistroSueloSchema = z.object({
  puntoId:             z.number().int().positive(),
  fecha:               z.string().datetime(),
  ph:                  z.number().min(0).max(14).optional(),
  conductividad:       z.number().min(0).optional(),
  materiaOrganica:     z.number().min(0).max(100).optional(),
  especiesRegistradas: z.string().max(2000).optional(),
  observaciones:       z.string().max(1000).optional(),
}).strict();

export const registrosSueloQuerySchema = z.object({
  puntoId: z.coerce.number().int().positive().optional(),
  desde:   z.string().optional(),
  hasta:   z.string().optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(200).default(20),
});

// ── PozoSeptico ────────────────────────────────────────────────────────────

export const crearPozoSchema = z.object({
  nombre:          z.string().min(1).max(100),
  descripcion:     z.string().max(500).optional(),
  latitud:         z.number().min(-90).max(90),
  longitud:        z.number().min(-180).max(180),
  capacidadM3:     z.number().positive().optional(),
  estado:          z.enum(estadoInfraValues).default("BUENO"),
  ultimaLimpieza:  z.string().datetime().optional(),
  proximaLimpieza: z.string().datetime().optional(),
  observaciones:   z.string().max(500).optional(),
}).strict();

export const actualizarPozoSchema = z.object({
  nombre:          z.string().min(1).max(100).optional(),
  descripcion:     z.string().max(500).optional(),
  latitud:         z.number().min(-90).max(90).optional(),
  longitud:        z.number().min(-180).max(180).optional(),
  capacidadM3:     z.number().positive().optional(),
  estado:          z.enum(estadoInfraValues).optional(),
  ultimaLimpieza:  z.string().datetime().optional(),
  proximaLimpieza: z.string().datetime().optional(),
  observaciones:   z.string().max(500).optional(),
  activo:          z.boolean().optional(),
}).strict().refine(d => Object.keys(d).length > 0, { message: "Debe enviar al menos un campo" });

export const pozosQuerySchema = z.object({
  activo: z.string().optional().transform(v => v === "false" ? false : true),
});

// ── ManifiestoAmbiental ────────────────────────────────────────────────────

export const crearManifiestoSchema = z.object({
  anio:        z.number().int().min(2000).max(2100),
  titulo:      z.string().min(1).max(200),
  descripcion: z.string().max(2000).optional(),
  objetivos:   z.string().max(2000).optional(),
  compromisos: z.string().max(2000).optional(),
  responsable: z.string().max(200).optional(),
  aprobadoAt:  z.string().datetime().optional(),
}).strict();

export const actualizarManifiestoSchema = z.object({
  titulo:      z.string().min(1).max(200).optional(),
  descripcion: z.string().max(2000).optional(),
  objetivos:   z.string().max(2000).optional(),
  compromisos: z.string().max(2000).optional(),
  responsable: z.string().max(200).optional(),
  aprobadoAt:  z.string().datetime().optional(),
}).strict().refine(d => Object.keys(d).length > 0, { message: "Debe enviar al menos un campo" });

export const manifiestoQuerySchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100).optional(),
});

// ── Types ──────────────────────────────────────────────────────────────────

export type CrearPuntoDTO             = z.infer<typeof crearPuntoSchema>;
export type ActualizarPuntoDTO        = z.infer<typeof actualizarPuntoSchema>;
export type PuntosQueryDTO            = z.infer<typeof puntosQuerySchema>;
export type CrearRegistroHidricoDTO   = z.infer<typeof crearRegistroHidricoSchema>;
export type RegistrosHidricosQueryDTO = z.infer<typeof registrosHidricosQuerySchema>;
export type CrearRegistroResiduoDTO   = z.infer<typeof crearRegistroResiduoSchema>;
export type RegistrosResiduoQueryDTO  = z.infer<typeof registrosResiduoQuerySchema>;
export type CrearRegistroRuidoDTO     = z.infer<typeof crearRegistroRuidoSchema>;
export type RegistrosRuidoQueryDTO    = z.infer<typeof registrosRuidoQuerySchema>;
export type CrearRegistroSueloDTO     = z.infer<typeof crearRegistroSueloSchema>;
export type RegistrosSueloQueryDTO    = z.infer<typeof registrosSueloQuerySchema>;
export type CrearPozoDTO              = z.infer<typeof crearPozoSchema>;
export type ActualizarPozoDTO         = z.infer<typeof actualizarPozoSchema>;
export type PozosQueryDTO             = z.infer<typeof pozosQuerySchema>;
export type CrearManifiestoDTO        = z.infer<typeof crearManifiestoSchema>;
export type ActualizarManifiestoDTO   = z.infer<typeof actualizarManifiestoSchema>;
export type ManifiestoQueryDTO        = z.infer<typeof manifiestoQuerySchema>;
