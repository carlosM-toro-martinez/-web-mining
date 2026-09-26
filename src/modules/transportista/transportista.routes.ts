import { Router } from "express";
import { transportistaController } from "./transportista.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createTransportistaSchema, updateTransportistaSchema, transportistaQuerySchema } from "./transportista.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(transportistaQuerySchema), transportistaController.getAll);
router.get("/:id", validateParams(idSchema), transportistaController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validate(createTransportistaSchema),
  transportistaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(updateTransportistaSchema),
  transportistaController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  transportistaController.remove,
);

export default router;
