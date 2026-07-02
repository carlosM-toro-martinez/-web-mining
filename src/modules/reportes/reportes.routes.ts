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

// Detalle completo de compras con proveedor, items valorados y totales
router.get("/compras-detalle", authorize("ADMIN", "ALMACENERO"), reportesController.getComprasDetalle);

// Balance mensual por grupo (?anio=2025&mes=9)
router.get("/balance-mensual", reportesController.getBalanceMensual);

// Inventario almacén jerárquico por producto
router.get("/inventario-almacen", reportesController.getInventarioAlmacen);

// Entradas al almacén por período (solo ingresos con valor Bs)
router.get("/entradas-almacen", reportesController.getEntradasAlmacen);

// Salidas del almacén por período (solo egresos con valor Bs)
router.get("/salidas-almacen", reportesController.getSalidasAlmacen);

// Compras detalladas por proveedor y factura con totalSinIVA (total − 13% IVA)
router.get("/compras-proveedor", authorize("ADMIN", "ALMACENERO"), reportesController.getComprasProveedor);

// Anulaciones de entradas (compras anuladas) por período
router.get("/anulaciones-entradas", authorize("ADMIN", "ALMACENERO"), reportesController.getAnulacionesEntradas);

// Anulaciones de salidas (vales anulados) por período
router.get("/anulaciones-salidas", authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"), reportesController.getAnulacionesSalidas);

export default router;
