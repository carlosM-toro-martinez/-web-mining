import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { comprasController } from "./compras.controller.js";
import { createCompraSchema, recibirCompraSchema, compraQuerySchema } from "./compras.schema.js";

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

// Crear compra (ADMIN, ALMACENERO)
router.post(
  "/",
  requirePermiso("inventario.compras", "crear"),
  validate(createCompraSchema),
  comprasController.createCompra,
);

// Listar compras
router.get("/", validateQuery(compraQuerySchema), comprasController.getCompras);

// Contadores del tablero de seguimiento (antes de "/:id" para que no lo tome como id)
router.get("/resumen", validateQuery(compraQuerySchema), comprasController.getResumen);

// Obtener compra por ID
router.get("/:id", validateParams(idSchema), comprasController.getCompraById);

// Registrar o cambiar el documento (factura, recibo o sin documento)
router.patch(
  "/:id/documento",
  requirePermiso("inventario.compras", "documento"),
  validateParams(idSchema),
  comprasController.registrarDocumento,
);

// Recibir compra (ADMIN, ALMACENERO)
router.post(
  "/:id/recibir",
  requirePermiso("inventario.recepcion", "recibir"),
  validateParams(idSchema),
  validate(recibirCompraSchema),
  comprasController.recibirCompra,
);
// También acepta PATCH para retrocompatibilidad
router.patch(
  "/:id/recibir",
  requirePermiso("inventario.recepcion", "recibir"),
  validateParams(idSchema),
  validate(recibirCompraSchema),
  comprasController.recibirCompra,
);

// Corregir precio de un item recibido (sin anular toda la compra) — solo ADMIN
router.patch(
  "/:compraId/items/:itemId/precio",
  authorize("ADMIN", "SUPERINTENDENTE"),
  comprasController.corregirPrecioItem,
);

// Anular compra (ADMIN, SUPERINTENDENTE, ALMACENERO)
router.post(
  "/:id/anular",
  requirePermiso("inventario.compras", "anular"),
  validateParams(idSchema),
  comprasController.anularCompra,
);

// Listar anulaciones de compras
router.get(
  "/anulaciones/historial",
  requirePermiso("inventario.compras", "ver_anulaciones"),
  comprasController.getAnulaciones,
);

export default router;
