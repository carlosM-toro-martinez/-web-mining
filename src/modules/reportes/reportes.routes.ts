import { Router } from "express";
import { reportesController } from "./reportes.controller.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

// Bin Card (movimientos sin valorización)
router.get("/bin-card", reportesController.getBinCard);

// Bin Card Valorado (kardex con precios)
router.get("/bin-card-valorado", reportesController.getBinCardValorado);

// Stock actual por producto (con cantidades reservadas y disponibles)
router.get("/stock", reportesController.getStockActual);

// Resumen de vales (filtrable por estado, solicitante, fecha)
router.get("/vales", authorize("ADMIN", "SUPERINTENDENTE", "ALMACENERO"), reportesController.getValesResumen);

// Resumen de compras (filtrable por estado, proveedor, fecha)
router.get("/compras", authorize("ADMIN", "ALMACENERO"), reportesController.getComprasResumen);

// Balance mensual por grupo (?anio=2025&mes=9)
router.get("/balance-mensual", reportesController.getBalanceMensual);

// Inventario almacén jerárquico por producto (?anio=2025&mes=9)
router.get("/inventario-almacen", reportesController.getInventarioAlmacen);

export default router;
