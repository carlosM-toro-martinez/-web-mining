import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { valesController } from "./vales.controller.js";
import {
  createValeSchema,
  aprobarValeSchema,
  entregarValeSchema,
  valeQuerySchema,
} from "./vales.schema.js";

const idSchema = z.object({
  id: z.string().min(1),
});

const validateParams = (schema: any) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return res
      .status(400)
      .json({ success: false, error: "Params validation error", details: result.error.flatten() });
  }
  next();
};

const validateQuery = (schema: any) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res
      .status(400)
      .json({ success: false, error: "Query validation error", details: result.error.flatten() });
  }
  next();
};

const router = Router();

router.use(authenticate);

// Crear vale (cualquier usuario autenticado)
router.post("/", validate(createValeSchema), valesController.createVale);

// Resumen de todos los solicitantes con conteo de vales
router.get(
  "/resumen-solicitantes",
  authorize("ADMIN", "SUPERINTENDENTE", "ALMACENERO"),
  valesController.getResumenSolicitantes,
);

// Productos pedidos por un usuario específico (con conteo y última fecha por producto)
router.get(
  "/usuario/:userId/productos",
  authorize("ADMIN", "SUPERINTENDENTE", "ALMACENERO"),
  valesController.getProductosUsuario,
);

// Historial de vales de un solicitante específico
router.get(
  "/solicitante/:userId",
  authorize("ADMIN", "SUPERINTENDENTE", "ALMACENERO"),
  valesController.getHistorialSolicitante,
);

// Listar vales
router.get("/", validateQuery(valeQuerySchema), valesController.getVales);

// Obtener vale por ID
router.get("/:id", validateParams(idSchema), valesController.getValeById);

// Aprobar vale
router.patch(
  "/:id/aprobar",
  authorize("ADMIN", "SUPERINTENDENTE", "ALMACENERO"),
  validateParams(idSchema),
  validate(aprobarValeSchema),
  valesController.aprobarVale,
);

// Entregar vale
router.patch(
  "/:id/entregar",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(entregarValeSchema),
  valesController.entregarVale,
);

// Rechazar vale
router.patch(
  "/:id/rechazar",
  authorize("ADMIN", "SUPERINTENDENTE", "ALMACENERO"),
  validateParams(idSchema),
  valesController.rechazarVale,
);

export default router;
