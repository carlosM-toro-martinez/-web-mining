import { Router } from "express";
import { tipoMineralController } from "./tipoMineral.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createTipoMineralSchema,
  updateTipoMineralSchema,
  tipoMineralQuerySchema,
} from "./tipoMineral.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(tipoMineralQuerySchema), tipoMineralController.getAll);
router.get("/:id", validateParams(idSchema), tipoMineralController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validate(createTipoMineralSchema),
  tipoMineralController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(updateTipoMineralSchema),
  tipoMineralController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  tipoMineralController.remove,
);

export default router;
