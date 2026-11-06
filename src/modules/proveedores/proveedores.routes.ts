import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { proveedoresController } from "./proveedores.controller.js";
import {
  createProveedorSchema,
  updateProveedorSchema,
  proveedorQuerySchema,
} from "./proveedores.schema.js";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
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

// Crear proveedor (ADMIN, ALMACENERO)
router.post(
  "/",
  requirePermiso("inventario.proveedores", "crear"),
  validate(createProveedorSchema),
  proveedoresController.createProveedor,
);

// Listar proveedores
router.get("/", validateQuery(proveedorQuerySchema), proveedoresController.getProveedores);

// Obtener proveedor por ID
router.get("/:id", validateParams(idSchema), proveedoresController.getProveedorById);

// Actualizar proveedor (ADMIN, ALMACENERO)
router.put(
  "/:id",
  requirePermiso("inventario.proveedores", "editar"),
  validateParams(idSchema),
  validate(updateProveedorSchema),
  proveedoresController.updateProveedor,
);

// Eliminar proveedor (ADMIN)
router.delete(
  "/:id",
  requirePermiso("inventario.proveedores", "eliminar"),
  validateParams(idSchema),
  proveedoresController.deleteProveedor,
);

export default router;
