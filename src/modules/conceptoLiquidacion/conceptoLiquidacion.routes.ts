import { Router } from "express";
import { conceptoLiquidacionController } from "./conceptoLiquidacion.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createConceptoLiquidacionSchema,
  updateConceptoLiquidacionSchema,
  conceptoLiquidacionQuerySchema,
} from "./conceptoLiquidacion.schema.js";
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

router.get("/", validateQuery(conceptoLiquidacionQuerySchema), conceptoLiquidacionController.getAll);
router.get("/:id", validateParams(idSchema), conceptoLiquidacionController.getById);

router.post(
  "/",
  requirePermiso("logistica.parametros", "crear"),
  validate(createConceptoLiquidacionSchema),
  conceptoLiquidacionController.create,
);

router.put(
  "/:id",
  requirePermiso("logistica.parametros", "editar"),
  validateParams(idSchema),
  validate(updateConceptoLiquidacionSchema),
  conceptoLiquidacionController.update,
);

router.delete(
  "/:id",
  requirePermiso("logistica.parametros", "eliminar"),
  validateParams(idSchema),
  conceptoLiquidacionController.remove,
);

export default router;
