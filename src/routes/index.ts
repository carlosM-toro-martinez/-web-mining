import { Router } from "express";
import productoRoutes from "../modules/producto/producto.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import categoriaInventarioRoutes from "../modules/categoriaInventario/categoriaInventario.routes.js";
import exploracionesRoutes from "../modules/exploraciones/exploraciones.routes.js";

const router = Router();

// Middleware para loggear que las rutas se están accediendo
router.use((req, res, next) => {
  console.log(`🛣️  Routes accessed: ${req.method} ${req.baseUrl}${req.path}`);
  next();
});

router.use("/auth", authRoutes);
router.use("/categorias-inventario", categoriaInventarioRoutes);
router.use("/productos", productoRoutes);
router.use("/exploraciones", exploracionesRoutes);

export default router;
