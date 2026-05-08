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
import miningExplorationRoutes from "../modules/miningExploration/miningExploration.routes.js";

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
router.use("/", miningExplorationRoutes);
router.use("/employees", employeeRoutes);
router.use("/biometric", biometricRoutes);
router.use("/iclock", biometricRoutes);

export default router;
