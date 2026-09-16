import { z } from "zod";

const categoriaRendicionGastoSchema = z.enum([
  "MATERIALES_SUMINISTROS",
  "TRANSPORTES",
  "ACTIVOS_FIJOS",
  "MANTENIMIENTO_SERVICIOS",
  "OBLIGACIONES_SOCIALES",
  "OBRAS_CONSTRUCCION",
  "GASTOS_ADMINISTRATIVOS",
  "OTROS_GASTOS_ADMINISTRATIVOS",
  "OTROS",
  "MEDIO_AMBIENTE",
]);

export const createPartidaPresupuestoCajaSchema = z
  .object({
    presupuestoId: z.number().int().positive(),
    descripcion: z.string().trim().min(1),
    montoPresupuestado: z.number().positive(),
    // Clasificación opcional de la partida: si se llena aquí, al registrar
    // el gasto real que la ejecuta el formulario se autocompleta con esto.
    centroCostoCajaId: z.number().int().positive().optional(),
    funcionGastoCajaId: z.number().int().positive().optional(),
    cuentaContableCajaId: z.number().int().positive().optional(),
    categoriaRendicion: categoriaRendicionGastoSchema.optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const updatePartidaPresupuestoCajaSchema = createPartidaPresupuestoCajaSchema.partial();

export const partidaPresupuestoCajaQuerySchema = z
  .object({
    presupuestoId: z.coerce.number().int().positive().optional(),
    cajaId: z.coerce.number().int().positive().optional(),
    anio: z.coerce.number().int().optional(),
    mes: z.coerce.number().int().optional(),
    soloActivas: z.coerce.boolean().optional(),
  })
  .strict();
