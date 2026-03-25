import { Router } from "express";
import productoRoutes from "../modules/producto/producto.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";

const router = Router();

// Middleware para loggear que las rutas se están accediendo
router.use((req, res, next) => {
  console.log(`🛣️  Routes accessed: ${req.method} ${req.baseUrl}${req.path}`);
  next();
});

router.use("/auth", authRoutes);
router.use("/productos", productoRoutes);

export default router;
