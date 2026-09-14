import { z } from "zod";

export const tipoDocumentoGastoSchema = z.enum(["FACTURA", "CONTRATO_RETENCION", "RECIBO_DIRECTO"]);
export const categoriaRetencionGastoSchema = z.enum(["SERVICIO", "COMPRA"]);
export const monedaCajaSchema = z.enum(["BOB", "USD"]);
export const estadoGastoCajaSchema = z.enum(["REGISTRADO", "RENDIDO", "ANULADO"]);
// Categorías del reporte mensual impreso ("Caja Lipeña"): agrupan los gastos
// para armar subtotales en el reporte, distinto de FuncionGastoCaja/CentroCostoCaja.
export const categoriaRendicionGastoSchema = z.enum([
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

export const createGastoCajaSchema = z
  .object({
    cajaId: z.number().int().positive(),
    fecha: z.coerce.date(),
    tipoDocumento: tipoDocumentoGastoSchema,
    categoriaRetencion: categoriaRetencionGastoSchema.optional(),
    categoriaRendicion: categoriaRendicionGastoSchema,
    proveedorNombre: z.string().min(1),
    proveedorNitCi: z.string().optional(),
    glosa: z.string().min(1),
    numeroRespaldo: z.string().optional(),
    montoTotal: z.number().positive(),
    moneda: monedaCajaSchema,
    centroCostoCajaId: z.number().int().positive(),
    funcionGastoCajaId: z.number().int().positive(),
  })
  .strict()
  .refine((data) => data.tipoDocumento !== "CONTRATO_RETENCION" || Boolean(data.categoriaRetencion), {
    message: "categoriaRetencion es obligatoria cuando el tipo de documento es CONTRATO_RETENCION",
    path: ["categoriaRetencion"],
  });

export const gastoCajaQuerySchema = z
  .object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    cajaId: z.coerce.number().int().positive().optional(),
    estado: estadoGastoCajaSchema.optional(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional(),
  })
  .strict();

export const anularGastoCajaSchema = z
  .object({
    motivo: z.string().trim().min(1),
  })
  .strict();
