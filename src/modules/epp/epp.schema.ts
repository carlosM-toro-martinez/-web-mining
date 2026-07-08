import { z } from "zod";

export const condicionEppValues = ["NUEVO", "EN_USO", "DEVUELTO_BUENO", "DEVUELTO_USADO", "BAJA"] as const;
export type CondicionEpp = (typeof condicionEppValues)[number];

export const crearAsignacionSchema = z
  .object({
    productoId:  z.number().int().positive(),
    usuarioId:   z.number().int().positive(),
    fechaEntrega: z.string().datetime().optional(),
    condicion:   z.enum(condicionEppValues).default("EN_USO"),
    observacion: z.string().max(500).optional(),
  })
  .strict();

export const actualizarAsignacionSchema = z
  .object({
    fechaDevolucion: z.string().datetime().optional(),
    condicion:       z.enum(condicionEppValues).optional(),
    observacion:     z.string().max(500).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Debe enviar al menos un campo" });

export const asignacionesQuerySchema = z.object({
  productoId: z.coerce.number().int().positive().optional(),
  usuarioId:  z.coerce.number().int().positive().optional(),
  condicion:  z.enum(condicionEppValues).optional(),
  activa:     z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(200).default(20),
  sinPaginar:  z.string().optional().transform((v) => v === "true"),
});

export const productosEppQuerySchema = z.object({
  search:     z.string().optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  soloConStock: z.string().optional().transform((v) => v === "true"),
});

export const trabajadoresQuerySchema = z.object({
  search:     z.string().optional(),
  soloActivos: z.string().optional().transform((v) => v === "true"),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
});

export type CrearAsignacionDTO      = z.infer<typeof crearAsignacionSchema>;
export type ActualizarAsignacionDTO = z.infer<typeof actualizarAsignacionSchema>;
export type AsignacionesQueryDTO    = z.infer<typeof asignacionesQuerySchema>;
export type ProductosEppQueryDTO    = z.infer<typeof productosEppQuerySchema>;
export type TrabajadoresQueryDTO    = z.infer<typeof trabajadoresQuerySchema>;
