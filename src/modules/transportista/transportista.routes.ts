import { Router } from "express";
import { transportistaController } from "./transportista.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createTransportistaSchema, updateTransportistaSchema, transportistaQuerySchema } from "./transportista.schema.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireModulo, requirePermiso } from "../../middleware/permiso.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);
// Leer requiere algún permiso de logística; cada acción, su permiso propio
// (ver src/modules/roles/permisos.catalogo.ts).
router.use(requireModulo("logistica"));

router.get("/", validateQuery(transportistaQuerySchema), transportistaController.getAll);
router.get("/:id", validateParams(idSchema), transportistaController.getById);

router.post(
  "/",
  requirePermiso("logistica.flota", "crear"),
  validate(createTransportistaSchema),
  transportistaController.create,
);

router.put(
  "/:id",
  requirePermiso("logistica.flota", "editar"),
  validateParams(idSchema),
  validate(updateTransportistaSchema),
  transportistaController.update,
);

router.delete(
  "/:id",
  requirePermiso("logistica.flota", "eliminar"),
  validateParams(idSchema),
  transportistaController.remove,
);

export default router;
