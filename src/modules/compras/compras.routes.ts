import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
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
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  validate(createCompraSchema),
  comprasController.createCompra,
);

// Listar compras
router.get("/", validateQuery(compraQuerySchema), comprasController.getCompras);

// Obtener compra por ID
router.get("/:id", validateParams(idSchema), comprasController.getCompraById);

// Recibir compra (ADMIN, ALMACENERO)
router.post(
  "/:id/recibir",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(recibirCompraSchema),
  comprasController.recibirCompra,
);
// También acepta PATCH para retrocompatibilidad
router.patch(
  "/:id/recibir",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(recibirCompraSchema),
  comprasController.recibirCompra,
);

// Anular compra (ADMIN, SUPERINTENDENTE)
router.post(
  "/:id/anular",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  comprasController.anularCompra,
);

// Listar anulaciones de compras
router.get(
  "/anulaciones/historial",
  authorize("ADMIN", "SUPERINTENDENTE", "ALMACENERO"),
  comprasController.getAnulaciones,
);

export default router;
