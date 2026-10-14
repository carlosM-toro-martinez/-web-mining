import { Router } from "express";
import { ingenioController } from "./ingenio.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createIngenioSchema, updateIngenioSchema, ingenioQuerySchema } from "./ingenio.schema.js";
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

router.get("/", validateQuery(ingenioQuerySchema), ingenioController.getAll);
router.get("/:id", validateParams(idSchema), ingenioController.getById);

router.post(
  "/",
  requirePermiso("logistica.parametros", "crear"),
  validate(createIngenioSchema),
  ingenioController.create,
);

router.put(
  "/:id",
  requirePermiso("logistica.parametros", "editar"),
  validateParams(idSchema),
  validate(updateIngenioSchema),
  ingenioController.update,
);

router.delete(
  "/:id",
  requirePermiso("logistica.parametros", "eliminar"),
  validateParams(idSchema),
  ingenioController.remove,
);

export default router;
