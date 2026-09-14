import { Router } from "express";
import { tarifaLiquidacionController } from "./tarifaLiquidacion.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createTarifaLiquidacionSchema,
  tarifaLiquidacionQuerySchema,
} from "./tarifaLiquidacion.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(tarifaLiquidacionQuerySchema), tarifaLiquidacionController.getAll);
router.get("/:id", validateParams(idSchema), tarifaLiquidacionController.getById);

// Parámetro financiero sensible: solo ADMIN/SUPERINTENDENTE definen tarifas.
router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validate(createTarifaLiquidacionSchema),
  tarifaLiquidacionController.create,
);

export default router;
