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

// POST /api/inventario-import/catalogo
// Sube Excel de catálogo → crea/actualiza Categorías y Productos
router.post(
  "/catalogo",
  authorize("ADMIN", "ALMACENERO"),
  upload.single("file"),
  inventarioImportController.importarCatalogo,
);

// POST /api/inventario-import/stock-inicial
// Carga masiva del stock actual (JSON)
router.post(
  "/stock-inicial",
  authorize("ADMIN", "ALMACENERO"),
  inventarioImportController.cargarStockInicial,
);

// POST /api/inventario-import/saldo-mensual
// Carga saldos históricos de un mes (JSON)
router.post(
  "/saldo-mensual",
  authorize("ADMIN", "ALMACENERO"),
  inventarioImportController.cargarSaldoMensual,
);

// GET /api/inventario-import/saldo-mensual?anio=2025&mes=9
// Consultar saldos mensuales cargados
router.get("/saldo-mensual", inventarioImportController.getSaldosMensuales);

export default router;
