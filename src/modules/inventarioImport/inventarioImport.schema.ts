import { z } from "zod";

// ─── Stock inicial ─────────────────────────────────────────────────────────────

export const stockInicialItemSchema = z.object({
  productoCodigo: z.string().min(1),
  cantidad: z.number().nonnegative(),
  precioUnit: z.number().nonnegative(),
});

export const stockInicialSchema = z.object({
  items: z.array(stockInicialItemSchema).min(1),
});

// ─── Autocomplete de productos ───────────────────────────────────────────────

export const autocompleteQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(2000),
});

// ─── Stock inicial – item individual con creación opcional ────────────────────

const nuevoProductoSchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  unidad: z.string().min(1),
  grupoId: z.number().int().positive(),
  subgrupoId: z.number().int().positive(),
  centroCostoId: z.number().int().positive(),
  funcionGastoId: z.number().int().positive(),
  esEpp: z.boolean().optional(),
});

export const stockInicialConProductoSchema = z
  .object({
    productoId: z.number().int().positive().optional(),
    crearProducto: nuevoProductoSchema.optional(),
    cantidad: z.number().nonnegative(),
    precioUnit: z.number().nonnegative(),
  })
  .refine(
    (d) => d.productoId !== undefined || d.crearProducto !== undefined,
    { message: "Se requiere productoId (producto existente) o crearProducto (nuevo producto)" },
  );

// ─── Saldo mensual – batch ────────────────────────────────────────────────────

export const saldoMensualSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  items: z
    .array(
      z.object({
        productoCodigo: z.string().min(1),
        saldoInicial: z.number().nonnegative(),
        ingresoQty: z.number().nonnegative(),
        salidaQty: z.number().nonnegative(),
        saldoFinal: z.number().nonnegative(),
        precioUnit: z.number().nonnegative(),
      }),
    )
    .min(1),
});

export const saldoMensualQuerySchema = z.object({
  anio: z.coerce.number().int().min(2000),
  mes: z.coerce.number().int().min(1).max(12),
});

// ─── Saldo mensual – item individual ─────────────────────────────────────────

export const saldoMensualItemSchema = z
  .object({
    productoId: z.number().int().positive().optional(),
    productoCodigo: z.string().min(1).optional(),
    anio: z.number().int().min(2000).max(2100),
    mes: z.number().int().min(1).max(12),
    saldoInicial: z.number().nonnegative(),
    ingresoQty: z.number().nonnegative(),
    salidaQty: z.number().nonnegative(),
    saldoFinal: z.number().nonnegative(),
    precioUnit: z.number().nonnegative(),
  })
  .refine((d) => d.productoId !== undefined || d.productoCodigo !== undefined, {
    message: "Se requiere productoId o productoCodigo",
  });

export const updateSaldoMensualItemSchema = z
  .object({
    saldoInicial: z.number().nonnegative().optional(),
    ingresoQty: z.number().nonnegative().optional(),
    salidaQty: z.number().nonnegative().optional(),
    saldoFinal: z.number().nonnegative().optional(),
    precioUnit: z.number().nonnegative().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Se requiere al menos un campo para actualizar",
  });

export const saldoMensualIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ─── Reiniciar stock ──────────────────────────────────────────────────────────

export const reiniciarStockSchema = z.object({
  confirmacion: z.literal("REINICIAR"),
});

// ─── Inicializar período ──────────────────────────────────────────────────────

export const inicializarPeriodoSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
});

// ─── Cierre de mes ───────────────────────────────────────────────────────────

export const cerrarMesSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
});

// ─── Ajuste de campos de SaldoMensual ────────────────────────────────────────
// Todos los campos son opcionales; se aplican solo los que se envíen.
// Si se cambia saldoInicial se recalcula saldoFinal y se propaga a meses siguientes.
// Si se cambia precioUnit se recalcula totalBs automáticamente (a menos que totalBs también se envíe).

export const ajusteCamposSaldoMensualSchema = z
  .object({
    totalBs:        z.number().nonnegative().optional(),
    totalBsProm:    z.number().nonnegative().optional(),
    totalBsInicial: z.number().nonnegative().optional(),
    precioUnit:     z.number().positive().optional(),
    saldoInicial:   z.number().int().nonnegative().optional(),
  })
  .refine(
    (d) =>
      d.totalBs !== undefined ||
      d.totalBsProm !== undefined ||
      d.totalBsInicial !== undefined ||
      d.precioUnit !== undefined ||
      d.saldoInicial !== undefined,
    { message: "Debe proporcionarse al menos un campo para actualizar" },
  );

// Aliases para compatibilidad con imports existentes en el controller
export const ajusteTotalBsSchema         = ajusteCamposSaldoMensualSchema;
export const ajusteTotalBsInicialSchema  = ajusteCamposSaldoMensualSchema;

export const ajusteInicialExcelQuerySchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});

// ─── Sincronizar stock ────────────────────────────────────────────────────────

export const sincronizarStockSchema = z
  .object({
    anio: z.number().int().min(2000).max(2100).optional(),
    mes: z.number().int().min(1).max(12).optional(),
  })
  .refine(
    (d) => {
      const tieneAnio = d.anio !== undefined;
      const tieneMes = d.mes !== undefined;
      return tieneAnio === tieneMes;
    },
    { message: "Si se especifica anio, también debe especificarse mes y viceversa" },
  );
