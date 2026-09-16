import { z } from "zod";

export const tipoDocumentoGastoSchema = z.enum(["FACTURA", "CONTRATO_RETENCION", "RECIBO_DIRECTO"]);
export const categoriaRetencionGastoSchema = z.enum(["SERVICIO", "COMPRA"]);
export const monedaCajaSchema = z.enum(["BOB", "USD"]);
export const estadoGastoCajaSchema = z.enum(["REGISTRADO", "RENDIDO", "ANULADO"]);
// CAJA: el gasto sale de una caja chica física (el flujo normal). BANCO: el
// pago se hizo directo desde una cuenta bancaria, sin pasar por ninguna
// caja — ej. una transferencia directa a un proveedor.
export const origenGastoCajaSchema = z.enum(["CAJA", "BANCO"]);
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
    origen: origenGastoCajaSchema.default("CAJA"),
    cajaId: z.number().int().positive().optional(),
    cuentaBancariaCajaId: z.number().int().positive().optional(),
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
    cuentaContableCajaId: z.number().int().positive(),
    partidaPresupuestoId: z.number().int().positive(),
  })
  .strict()
  .refine((data) => data.tipoDocumento !== "CONTRATO_RETENCION" || Boolean(data.categoriaRetencion), {
    message: "categoriaRetencion es obligatoria cuando el tipo de documento es CONTRATO_RETENCION",
    path: ["categoriaRetencion"],
  })
  .refine((data) => data.origen !== "CAJA" || Boolean(data.cajaId), {
    message: "Debes elegir una caja cuando el gasto sale de una caja chica",
    path: ["cajaId"],
  })
  .refine((data) => data.origen !== "BANCO" || Boolean(data.cuentaBancariaCajaId), {
    message: "Debes elegir la cuenta bancaria cuando el gasto sale directo del banco",
    path: ["cuentaBancariaCajaId"],
  });

export const gastoCajaQuerySchema = z
  .object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    cajaId: z.coerce.number().int().positive().optional(),
    cuentaBancariaCajaId: z.coerce.number().int().positive().optional(),
    origen: origenGastoCajaSchema.optional(),
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
