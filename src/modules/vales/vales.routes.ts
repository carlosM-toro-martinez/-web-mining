import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
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

// Auditoría de anulaciones
router.get(
  "/anulaciones",
  requirePermiso("inventario.vales", "ver_resumenes"),
  valesController.getAnulaciones,
);

// Resumen de todos los solicitantes con conteo de vales
router.get(
  "/resumen-solicitantes",
  requirePermiso("inventario.vales", "ver_resumenes"),
  valesController.getResumenSolicitantes,
);

// Productos pedidos por un usuario específico (con conteo y última fecha por producto)
router.get(
  "/usuario/:userId/productos",
  requirePermiso("inventario.vales", "ver_resumenes"),
  valesController.getProductosUsuario,
);

// Historial de vales de un solicitante específico
router.get(
  "/solicitante/:userId",
  requirePermiso("inventario.vales", "ver_resumenes"),
  valesController.getHistorialSolicitante,
);

// Listar vales
router.get("/", validateQuery(valeQuerySchema), valesController.getVales);

// Obtener vale por ID
router.get("/:id", validateParams(idSchema), valesController.getValeById);

// Aprobar vale
router.post(
  "/:id/aprobar",
  requirePermiso("inventario.vales", "aprobar"),
  validateParams(idSchema),
  validate(aprobarValeSchema),
  valesController.aprobarVale,
);
router.patch(
  "/:id/aprobar",
  requirePermiso("inventario.vales", "aprobar"),
  validateParams(idSchema),
  validate(aprobarValeSchema),
  valesController.aprobarVale,
);

// Entregar vale
router.post(
  "/:id/entregar",
  requirePermiso("inventario.vales", "entregar"),
  validateParams(idSchema),
  validate(entregarValeSchema),
  valesController.entregarVale,
);
// También acepta PATCH para retrocompatibilidad
router.patch(
  "/:id/entregar",
  requirePermiso("inventario.vales", "entregar"),
  validateParams(idSchema),
  validate(entregarValeSchema),
  valesController.entregarVale,
);

// Rechazar vale
router.post("/:id/rechazar", requirePermiso("inventario.vales", "rechazar"), validateParams(idSchema), valesController.rechazarVale);
router.patch("/:id/rechazar", requirePermiso("inventario.vales", "rechazar"), validateParams(idSchema), valesController.rechazarVale);

// Anular vale (ADMIN, SUPERINTENDENTE, ALMACENERO)
router.post("/:id/anular", requirePermiso("inventario.vales", "anular"), validateParams(idSchema), valesController.anularVale);
router.patch("/:id/anular", requirePermiso("inventario.vales", "anular"), validateParams(idSchema), valesController.anularVale);

// Eliminar vale permanentemente — solo ADMIN, sin contra-asientos
router.delete("/:id/eliminar", authorize("ADMIN"), validateParams(idSchema), valesController.eliminarVale);

export default router;
