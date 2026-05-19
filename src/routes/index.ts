import { Router } from "express";
import productoRoutes from "../modules/producto/producto.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import categoriaInventarioRoutes from "../modules/categoriaInventario/categoriaInventario.routes.js";
import exploracionesRoutes from "../modules/exploraciones/exploraciones.routes.js";
import contabilidadRoutes from "../modules/contabilidad/contabilidad.routes.js";
import movimientoRoutes from "../modules/movimiento/movimiento.routes.js";
import valesRoutes from "../modules/vales/vales.routes.js";
import comprasRoutes from "../modules/compras/compras.routes.js";
import proveedoresRoutes from "../modules/proveedores/proveedores.routes.js";
import reportesRoutes from "../modules/reportes/reportes.routes.js";
import employeeRoutes from "../modules/employee/employee.routes.js";
import biometricRoutes from "../modules/biometric/biometric.routes.js";
// iclock routes are mounted at root level in app.ts (ADMS protocol, not under /api)
import miningExplorationRoutes from "../modules/miningExploration/miningExploration.routes.js";
import surfaceExplorationRoutes from "../modules/surfaceExploration/surfaceExploration.routes.js";
import miningExcelRoutes from "../modules/miningExcel/miningExcel.routes.js";
import pedidosRoutes from "../modules/pedidos/pedidos.routes.js";
import inventarioImportRoutes from "../modules/inventarioImport/inventarioImport.routes.js";

const router = Router();

// Middleware para loggear que las rutas se están accediendo
router.use((req, res, next) => {
  console.log(`🛣️  Routes accessed: ${req.method} ${req.baseUrl}${req.path}`);
  next();
});

router.use("/auth", authRoutes);
router.use("/categorias-inventario", categoriaInventarioRoutes);
router.use("/productos", productoRoutes);
router.use("/contabilidad", contabilidadRoutes);
router.use("/", contabilidadRoutes);
router.use("/movimientos", movimientoRoutes);
router.use("/vales", valesRoutes);
router.use("/compras", comprasRoutes);
router.use("/proveedores", proveedoresRoutes);
router.use("/exploraciones", exploracionesRoutes);
router.use("/reportes", reportesRoutes);
router.use("/mining-exploration", miningExplorationRoutes);
router.use("/", miningExplorationRoutes);
router.use("/surface-exploration", surfaceExplorationRoutes);
router.use("/employees", employeeRoutes);
router.use("/biometric", biometricRoutes);
router.use("/imports/mining-excel", miningExcelRoutes);
router.use("/pedidos", pedidosRoutes);
router.use("/inventario-import", inventarioImportRoutes);

export default router;
