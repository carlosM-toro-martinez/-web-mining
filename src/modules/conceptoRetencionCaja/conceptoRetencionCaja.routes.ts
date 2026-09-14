import { Router } from "express";
import { conceptoRetencionCajaController } from "./conceptoRetencionCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createConceptoRetencionCajaSchema,
  updateConceptoRetencionCajaSchema,
  conceptoRetencionCajaQuerySchema,
} from "./conceptoRetencionCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(conceptoRetencionCajaQuerySchema), conceptoRetencionCajaController.getAll);
router.get("/:id", validateParams(idSchema), conceptoRetencionCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validate(createConceptoRetencionCajaSchema),
  conceptoRetencionCajaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updateConceptoRetencionCajaSchema),
  conceptoRetencionCajaController.update,
);

export default router;
