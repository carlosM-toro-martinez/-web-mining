import { Router } from "express";
import { reportesController } from "./reportes.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";

const router = Router();

router.use(authenticate);

// Bin Card (movimientos sin valorización)
router.get("/bin-card", reportesController.getBinCard);

// Bin Card Valorado (kardex con precios)
router.get("/bin-card-valorado", reportesController.getBinCardValorado);

// Stock actual por producto (con cantidades reservadas y disponibles)
router.get("/stock", reportesController.getStockActual);

// Resumen de vales (filtrable por estado, solicitante, fecha)
router.get("/vales", requirePermiso("inventario.reportes", "ver"), reportesController.getValesResumen);

// Resumen de compras (filtrable por estado, proveedor, fecha)
router.get("/compras", requirePermiso("inventario.reportes", "ver"), reportesController.getComprasResumen);

// Detalle completo de compras con proveedor, items valorados y totales
router.get("/compras-detalle", requirePermiso("inventario.reportes", "ver"), reportesController.getComprasDetalle);

// Saldos iniciales por mes: muestra totalBsInicial corregido o saldoInicial×precioUnit como fallback
router.get("/saldos-iniciales", reportesController.getSaldosIniciales);

// Balance mensual por grupo (?anio=2025&mes=9)
router.get("/balance-mensual", reportesController.getBalanceMensual);

// Inventario almacén jerárquico por producto
router.get("/inventario-almacen", reportesController.getInventarioAlmacen);

// Entradas al almacén por período (solo ingresos con valor Bs)
router.get("/entradas-almacen", reportesController.getEntradasAlmacen);

// Salidas del almacén por período (solo egresos con valor Bs)
router.get("/salidas-almacen", reportesController.getSalidasAlmacen);

// Compras detalladas por proveedor y factura con totalSinIVA (total − 13% IVA)
router.get("/compras-proveedor", requirePermiso("inventario.reportes", "ver"), reportesController.getComprasProveedor);

// Detalle de materiales: salidas agrupadas por sub-cuenta × sub-centro contable
router.get("/detalle-materiales", requirePermiso("inventario.reportes", "ver"), reportesController.getDetalleMateriales);

// Diario almacenes: libro diario contable DEBE (inventario) / HABER (cuentas de gasto)
router.get("/diario-almacenes", requirePermiso("inventario.reportes", "ver"), reportesController.getDiarioAlmacenes);

// Cuadro inventarios y suministros: compras por proveedor/mes con grupo de producto
router.get("/cuadro-suministros", requirePermiso("inventario.reportes", "ver"), reportesController.getCuadroSuministros);

// Anulaciones de entradas (compras anuladas) por período
router.get("/anulaciones-entradas", requirePermiso("inventario.reportes", "ver"), reportesController.getAnulacionesEntradas);

// Anulaciones de salidas (vales anulados) por período
router.get("/anulaciones-salidas", requirePermiso("inventario.reportes", "ver"), reportesController.getAnulacionesSalidas);

// Salidas individuales auditables con filtros opcionales de cuenta contable
router.get("/salidas-detalle", requirePermiso("inventario.reportes", "ver"), reportesController.getSalidasDetalle);

// Compras de productos que ya tenían saldo inicial, agrupadas por grupo de producto
router.get("/compras-con-saldo-inicial", requirePermiso("inventario.reportes", "ver"), reportesController.getComprasConSaldoInicial);

export default router;
