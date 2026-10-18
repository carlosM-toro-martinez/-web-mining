import { Router } from "express";
import { tarifaLiquidacionController } from "./tarifaLiquidacion.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createTarifaLiquidacionSchema,
  tarifaAplicableQuerySchema,
  tarifaLiquidacionQuerySchema,
} from "./tarifaLiquidacion.schema.js";
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

router.get("/", validateQuery(tarifaLiquidacionQuerySchema), tarifaLiquidacionController.getAll);
router.get("/aplicable", validateQuery(tarifaAplicableQuerySchema), tarifaLiquidacionController.aplicable);
router.get("/:id", validateParams(idSchema), tarifaLiquidacionController.getById);

router.post(
  "/",
  requirePermiso("logistica.parametros", "crear"),
  validate(createTarifaLiquidacionSchema),
  tarifaLiquidacionController.create,
);

router.delete(
  "/:id",
  requirePermiso("logistica.parametros", "eliminar"),
  validateParams(idSchema),
  tarifaLiquidacionController.remove,
);

export default router;
