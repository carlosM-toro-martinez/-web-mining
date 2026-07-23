import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { inventarioImportController } from "./inventarioImport.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.endsWith(".xls") ||
      file.originalname.endsWith(".xlsx");
    ok ? cb(null, true) : cb(new Error("Solo se aceptan archivos .xls o .xlsx"));
  },
});

const router = Router();
router.use(authenticate);

// ─── Autocomplete de productos ───────────────────────────────────────────────
// GET /api/inventario-import/productos/buscar?q=cemento&limit=20
// Busca productos por nombre O código. Para usar en formularios con autocomplete.
router.get(
  "/productos/buscar",
  inventarioImportController.buscarProductos,
);

// ─── Catálogo Excel ───────────────────────────────────────────────────────────
// POST /api/inventario-import/catalogo?anio=2025&mes=9
// Crea/actualiza Categorías y Productos. Si se pasan anio+mes también graba SaldoMensual.
// NO toca la tabla Stock.
router.post(
  "/catalogo",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  upload.single("file"),
  inventarioImportController.importarCatalogo,
);

// ─── Stock inicial ────────────────────────────────────────────────────────────
// POST /api/inventario-import/stock-inicial
// Carga batch de stock actual (como primer registro, crea Movimiento SALDO_INICIAL).
router.post(
  "/stock-inicial",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  inventarioImportController.cargarStockInicial,
);

// POST /api/inventario-import/stock-inicial/item
// Carga o crea un producto + su stock inicial desde un formulario.
// Body con producto existente: { productoId, cantidad, precioUnit }
// Body con producto nuevo:     { crearProducto: { codigo, nombre, unidad, grupoId, subgrupoId, centroCostoId, funcionGastoId }, cantidad, precioUnit }
router.post(
  "/stock-inicial/item",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  inventarioImportController.cargarStockInicialItem,
);

// ─── Reiniciar stock ──────────────────────────────────────────────────────────
// POST /api/inventario-import/reiniciar-stock
// Elimina todos los registros de Stock para empezar desde cero.
// Body: { "confirmacion": "REINICIAR" }
router.post(
  "/reiniciar-stock",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  inventarioImportController.reiniciarStock,
);

// ─── Sincronizar stock desde SaldoMensual ─────────────────────────────────────
// POST /api/inventario-import/sincronizar-stock
// Calcula Stock desde el SaldoMensual más reciente de cada producto.
// Body opcional: { "anio": 2025, "mes": 9 } para sincronizar desde un período específico.
router.post(
  "/sincronizar-stock",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  inventarioImportController.sincronizarStock,
);

// ─── Saldo mensual – batch ────────────────────────────────────────────────────
// POST /api/inventario-import/saldo-mensual
// Carga masiva de saldos históricos de un mes (JSON).
router.post(
  "/saldo-mensual",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  inventarioImportController.cargarSaldoMensual,
);

// GET /api/inventario-import/saldo-mensual?anio=2025&mes=9
// Lista todos los registros de un período.
router.get(
  "/saldo-mensual",
  inventarioImportController.getSaldosMensuales,
);

// GET /api/inventario-import/saldo-mensual/preview?anio=2025&mes=9
// Vista en tiempo real del período: saldoInicial + movimientos retroactivos ya cargados.
// Funciona tanto si el mes está cerrado como si no.
router.get(
  "/saldo-mensual/preview",
  inventarioImportController.getPreviewPeriodo,
);

// ─── Saldo mensual – item individual ─────────────────────────────────────────
// POST /api/inventario-import/saldo-mensual/item
// Upsert de un producto para un mes (para carga uno por uno desde formulario).
// Body: { productoId | productoCodigo, anio, mes, saldoInicial, ingresoQty, salidaQty, saldoFinal, precioUnit }
router.post(
  "/saldo-mensual/item",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  inventarioImportController.upsertSaldoMensualItem,
);

// POST /api/inventario-import/saldo-mensual/inicializar
// Siembra SaldoMensual de todos los productos para un período.
// Usa saldoFinal del mes anterior como saldoInicial; si no hay anterior, usa Stock actual.
// Solo crea registros que no existan (no sobreescribe).
// Body: { anio, mes }
router.post(
  "/saldo-mensual/inicializar",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  inventarioImportController.inicializarPeriodo,
);

// POST /api/inventario-import/saldo-mensual/ajuste-inicial/excel?anio=2025&mes=10
// Carga masiva de totalBsInicial desde Excel. Columnas: "codigo" | "totalBsInicial"
// Funciona en períodos cerrados. Solo ADMIN.
router.post(
  "/saldo-mensual/ajuste-inicial/excel",
  authorize("ADMIN"),
  upload.single("file"),
  inventarioImportController.ajustarTotalBsInicialExcel,
);

// PATCH /api/inventario-import/saldo-mensual/:id/ajuste-inicial
// Setea directamente el totalBsInicial de un registro (monto de apertura en Bs).
// Funciona en períodos cerrados. Solo ADMIN.
// Body: { "totalBsInicial": 304413.49 }
router.patch(
  "/saldo-mensual/:id/ajuste-inicial",
  authorize("ADMIN"),
  inventarioImportController.ajustarTotalBsInicial,
);

// PATCH /api/inventario-import/saldo-mensual/:id/ajuste-total
// Corrige directamente totalBs (y opcionalmente totalBsProm) sin recalcular desde precioUnit.
// Funciona en períodos cerrados. Solo ADMIN.
// Body: { "totalBs": 304413.49, "totalBsProm": 304413.49 }
router.patch(
  "/saldo-mensual/:id/ajuste-total",
  authorize("ADMIN"),
  inventarioImportController.ajustarTotalBs,
);

// GET  /api/inventario-import/saldo-mensual/:id
// Obtener un registro por UUID.
router.get(
  "/saldo-mensual/:id",
  inventarioImportController.getSaldoMensualById,
);

// PATCH /api/inventario-import/saldo-mensual/:id
// Actualizar campos de un registro existente.
router.patch(
  "/saldo-mensual/:id",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  inventarioImportController.updateSaldoMensualItem,
);

// DELETE /api/inventario-import/saldo-mensual/:id
// Eliminar un registro de saldo mensual.
router.delete(
  "/saldo-mensual/:id",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  inventarioImportController.deleteSaldoMensualItem,
);

// ─── Recalcular stock histórico ───────────────────────────────────────────────
// POST /api/inventario-import/recalcular-stock
// Body: { productoId, stockInicial, eliminarValeIds?: string[] }
router.post(
  "/recalcular-stock",
  authorize("ADMIN"),
  inventarioImportController.recalcularStock,
);

// GET /api/inventario-import/movimientos/:productoId
// Ver todos los movimientos de un producto (para identificar IDs a eliminar)
router.get(
  "/movimientos/:productoId",
  authorize("ADMIN"),
  inventarioImportController.getMovimientosProducto,
);

// ─── Cierre de mes ────────────────────────────────────────────────────────────
// POST /api/inventario-import/cierre-mes
// Body: { anio, mes }
// Consolida movimientos del mes en SaldoMensual y bloquea el período.
router.post(
  "/cierre-mes",
  authorize("ADMIN", "SUPERINTENDENTE"),
  inventarioImportController.cerrarMes,
);

// GET /api/inventario-import/cierre-mes
// Lista todos los períodos cerrados.
router.get(
  "/cierre-mes",
  inventarioImportController.getCierres,
);

// DELETE /api/inventario-import/cierre-mes
// Body: { anio, mes }
// Reabre un período cerrado para permitir correcciones.
router.delete(
  "/cierre-mes",
  authorize("ADMIN", "SUPERINTENDENTE"),
  inventarioImportController.reabrirMes,
);

// POST /api/inventario-import/recalcular-precios
// Recalcula precioUnit, precioUnitProm, ingresosBs y totalBsProm en todos los
// SaldoMensual históricos que tengan ingresoQty > 0, leyendo los Movimiento reales.
// Ejecutar UNA vez tras la migración que agregó los nuevos campos.
router.post(
  "/recalcular-precios",
  authorize("ADMIN"),
  inventarioImportController.recalcularPreciosProm,
);

// ─── Ajuste masivo de SaldoMensual por mes ────────────────────────────────────
// POST /api/inventario-import/ajuste-productos-mes
// Body: { anio, mes, productos: [{ productoId | productoCodigo, precioUnit?, saldoInicial?,
//         saldoFinal?, ingresoQty?, salidaQty?, totalBs?, totalBsInicial? }] }
// Solo ADMIN. Rechaza productos que tengan movimientos en ese mes.
router.post(
  "/ajuste-productos-mes",
  authorize("ADMIN"),
  inventarioImportController.ajusteProductosMes,
);

// ─── Ajuste de precios sin IVA ────────────────────────────────────────────────
// POST /api/inventario-import/ajustar-precios-sin-iva
// Body: { anio, mes }
// Aplica ×0.87 a todos los SaldoMensual del mes que tuvieron compras, y propaga
// el ajuste hacia los meses siguientes (cascade). Solo ADMIN.
router.post(
  "/ajustar-precios-sin-iva",
  authorize("ADMIN"),
  inventarioImportController.ajustarPreciosSinIva,
);

// ─── Diagnóstico de precios ───────────────────────────────────────────────────
// GET /api/inventario-import/diagnostico-precios?anio=2025&mes=10
// Devuelve productos con stock > 0 y precioUnit = 0 (sin precio asignado).
router.get(
  "/diagnostico-precios",
  authorize("ADMIN", "SUPERINTENDENTE"),
  inventarioImportController.diagnosticarPrecios,
);

// ─── Diagnóstico de saldos / movimientos ─────────────────────────────────────
// GET /api/inventario-import/diagnostico-saldos?anio=2025&mes=10
// Compara SaldoMensual (salidaQty, ingresoQty, saldoFinal) contra movimientos reales.
// Muestra discrepancias y verifica la ecuación contable por producto.
router.get(
  "/diagnostico-saldos",
  authorize("ADMIN", "SUPERINTENDENTE"),
  inventarioImportController.diagnosticarSaldos,
);

export default router;
