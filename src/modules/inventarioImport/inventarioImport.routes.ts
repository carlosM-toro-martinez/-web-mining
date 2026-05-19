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
  authorize("ADMIN", "ALMACENERO"),
  upload.single("file"),
  inventarioImportController.importarCatalogo,
);

// ─── Stock inicial ────────────────────────────────────────────────────────────
// POST /api/inventario-import/stock-inicial
// Carga batch de stock actual (como primer registro, crea Movimiento SALDO_INICIAL).
router.post(
  "/stock-inicial",
  authorize("ADMIN", "ALMACENERO"),
  inventarioImportController.cargarStockInicial,
);

// POST /api/inventario-import/stock-inicial/item
// Carga o crea un producto + su stock inicial desde un formulario.
// Body con producto existente: { productoId, cantidad, precioUnit }
// Body con producto nuevo:     { crearProducto: { codigo, nombre, unidad, grupoId, subgrupoId, centroCostoId, funcionGastoId }, cantidad, precioUnit }
router.post(
  "/stock-inicial/item",
  authorize("ADMIN", "ALMACENERO"),
  inventarioImportController.cargarStockInicialItem,
);

// ─── Reiniciar stock ──────────────────────────────────────────────────────────
// POST /api/inventario-import/reiniciar-stock
// Elimina todos los registros de Stock para empezar desde cero.
// Body: { "confirmacion": "REINICIAR" }
router.post(
  "/reiniciar-stock",
  authorize("ADMIN"),
  inventarioImportController.reiniciarStock,
);

// ─── Sincronizar stock desde SaldoMensual ─────────────────────────────────────
// POST /api/inventario-import/sincronizar-stock
// Calcula Stock desde el SaldoMensual más reciente de cada producto.
// Body opcional: { "anio": 2025, "mes": 9 } para sincronizar desde un período específico.
router.post(
  "/sincronizar-stock",
  authorize("ADMIN", "ALMACENERO"),
  inventarioImportController.sincronizarStock,
);

// ─── Saldo mensual – batch ────────────────────────────────────────────────────
// POST /api/inventario-import/saldo-mensual
// Carga masiva de saldos históricos de un mes (JSON).
router.post(
  "/saldo-mensual",
  authorize("ADMIN", "ALMACENERO"),
  inventarioImportController.cargarSaldoMensual,
);

// GET /api/inventario-import/saldo-mensual?anio=2025&mes=9
// Lista todos los registros de un período.
router.get(
  "/saldo-mensual",
  inventarioImportController.getSaldosMensuales,
);

// ─── Saldo mensual – item individual ─────────────────────────────────────────
// POST /api/inventario-import/saldo-mensual/item
// Upsert de un producto para un mes (para carga uno por uno desde formulario).
// Body: { productoId | productoCodigo, anio, mes, saldoInicial, ingresoQty, salidaQty, saldoFinal, precioUnit }
router.post(
  "/saldo-mensual/item",
  authorize("ADMIN", "ALMACENERO"),
  inventarioImportController.upsertSaldoMensualItem,
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
  authorize("ADMIN", "ALMACENERO"),
  inventarioImportController.updateSaldoMensualItem,
);

// DELETE /api/inventario-import/saldo-mensual/:id
// Eliminar un registro de saldo mensual.
router.delete(
  "/saldo-mensual/:id",
  authorize("ADMIN"),
  inventarioImportController.deleteSaldoMensualItem,
);

export default router;
