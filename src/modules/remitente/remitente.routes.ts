import { Router } from "express";
import { remitenteController } from "./remitente.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createRemitenteSchema, updateRemitenteSchema, remitenteQuerySchema } from "./remitente.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(remitenteQuerySchema), remitenteController.getAll);
router.get("/:id", validateParams(idSchema), remitenteController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validate(createRemitenteSchema),
  remitenteController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(updateRemitenteSchema),
  remitenteController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  remitenteController.remove,
);

export default router;
