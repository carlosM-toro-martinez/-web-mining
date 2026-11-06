import { Router } from "express";
import { productoController } from "./producto.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  createProductoSchema,
  updateProductoSchema,
  productoQuerySchema,
} from "./producto.schema.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const validateQuery = (schema: any) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res
      .status(400)
      .json({ success: false, error: "Query validation error", details: result.error.flatten() });
  }
  next();
};

const validateParams = (schema: any) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return res
      .status(400)
      .json({ success: false, error: "Params validation error", details: result.error.flatten() });
  }
  next();
};

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(productoQuerySchema), productoController.getAll);
router.get("/:id", validateParams(idSchema), productoController.getById);

router.post(
  "/",
  requirePermiso("inventario.productos", "crear"),
  validate(createProductoSchema),
  productoController.create,
);

router.put(
  "/:id",
  requirePermiso("inventario.productos", "editar"),
  validateParams(idSchema),
  validate(updateProductoSchema),
  productoController.update,
);

router.delete(
  "/:id",
  requirePermiso("inventario.productos", "eliminar"),
  validateParams(idSchema),
  productoController.remove,
);

export default router;
