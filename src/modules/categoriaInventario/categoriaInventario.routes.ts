import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { categoriaInventarioController } from "./categoriaInventario.controller.js";
import {
  categoriaInventarioQuerySchema,
  createCategoriaInventarioSchema,
  updateCategoriaInventarioSchema,
} from "./categoriaInventario.schema.js";

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

router.get("/tree", categoriaInventarioController.getTree);
router.get("/", validateQuery(categoriaInventarioQuerySchema), categoriaInventarioController.getAll);
router.get("/:id", validateParams(idSchema), categoriaInventarioController.getById);

router.post(
  "/",
  requirePermiso("inventario.productos", "crear"),
  validate(createCategoriaInventarioSchema),
  categoriaInventarioController.create,
);

router.put(
  "/:id",
  requirePermiso("inventario.productos", "editar"),
  validateParams(idSchema),
  validate(updateCategoriaInventarioSchema),
  categoriaInventarioController.update,
);

router.delete(
  "/:id",
  requirePermiso("inventario.productos", "eliminar"),
  validateParams(idSchema),
  categoriaInventarioController.remove,
);

export default router;
