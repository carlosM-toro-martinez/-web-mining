import { Router } from "express";
import { conceptoLiquidacionController } from "./conceptoLiquidacion.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createConceptoLiquidacionSchema,
  updateConceptoLiquidacionSchema,
  conceptoLiquidacionQuerySchema,
} from "./conceptoLiquidacion.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(conceptoLiquidacionQuerySchema), conceptoLiquidacionController.getAll);
router.get("/:id", validateParams(idSchema), conceptoLiquidacionController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validate(createConceptoLiquidacionSchema),
  conceptoLiquidacionController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(updateConceptoLiquidacionSchema),
  conceptoLiquidacionController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  conceptoLiquidacionController.remove,
);

export default router;
