import { Router } from "express";
import { choferController } from "./chofer.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createChoferSchema, updateChoferSchema, choferQuerySchema } from "./chofer.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(choferQuerySchema), choferController.getAll);
router.get("/:id", validateParams(idSchema), choferController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validate(createChoferSchema),
  choferController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(updateChoferSchema),
  choferController.update,
);

export default router;
