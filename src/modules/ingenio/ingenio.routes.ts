import { Router } from "express";
import { ingenioController } from "./ingenio.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createIngenioSchema, updateIngenioSchema, ingenioQuerySchema } from "./ingenio.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(ingenioQuerySchema), ingenioController.getAll);
router.get("/:id", validateParams(idSchema), ingenioController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validate(createIngenioSchema),
  ingenioController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(updateIngenioSchema),
  ingenioController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  ingenioController.remove,
);

export default router;
