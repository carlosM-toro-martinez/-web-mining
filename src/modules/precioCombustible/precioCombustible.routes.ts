import { Router } from "express";
import { precioCombustibleController } from "./precioCombustible.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createPrecioCombustibleSchema, precioCombustibleQuerySchema } from "./precioCombustible.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(precioCombustibleQuerySchema), precioCombustibleController.getAll);
router.get("/:id", validateParams(idSchema), precioCombustibleController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validate(createPrecioCombustibleSchema),
  precioCombustibleController.create,
);

export default router;
