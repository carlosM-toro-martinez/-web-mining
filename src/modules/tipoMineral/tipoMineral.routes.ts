import { Router } from "express";
import { tipoMineralController } from "./tipoMineral.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createTipoMineralSchema,
  updateTipoMineralSchema,
  tipoMineralQuerySchema,
} from "./tipoMineral.schema.js";
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

router.get("/", validateQuery(tipoMineralQuerySchema), tipoMineralController.getAll);
router.get("/:id", validateParams(idSchema), tipoMineralController.getById);

router.post(
  "/",
  requirePermiso("logistica.parametros", "crear"),
  validate(createTipoMineralSchema),
  tipoMineralController.create,
);

router.put(
  "/:id",
  requirePermiso("logistica.parametros", "editar"),
  validateParams(idSchema),
  validate(updateTipoMineralSchema),
  tipoMineralController.update,
);

router.delete(
  "/:id",
  requirePermiso("logistica.parametros", "eliminar"),
  validateParams(idSchema),
  tipoMineralController.remove,
);

export default router;
