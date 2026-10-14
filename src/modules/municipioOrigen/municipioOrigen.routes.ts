import { Router } from "express";
import { municipioOrigenController } from "./municipioOrigen.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createMunicipioOrigenSchema,
  updateMunicipioOrigenSchema,
  municipioOrigenQuerySchema,
} from "./municipioOrigen.schema.js";
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

router.get("/", validateQuery(municipioOrigenQuerySchema), municipioOrigenController.getAll);
router.get("/:id", validateParams(idSchema), municipioOrigenController.getById);

router.post(
  "/",
  requirePermiso("logistica.parametros", "crear"),
  validate(createMunicipioOrigenSchema),
  municipioOrigenController.create,
);

router.put(
  "/:id",
  requirePermiso("logistica.parametros", "editar"),
  validateParams(idSchema),
  validate(updateMunicipioOrigenSchema),
  municipioOrigenController.update,
);

router.delete(
  "/:id",
  requirePermiso("logistica.parametros", "eliminar"),
  validateParams(idSchema),
  municipioOrigenController.remove,
);

export default router;
