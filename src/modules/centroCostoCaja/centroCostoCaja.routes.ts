import { Router } from "express";
import { centroCostoCajaController } from "./centroCostoCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createCentroCostoCajaSchema,
  updateCentroCostoCajaSchema,
  centroCostoCajaQuerySchema,
} from "./centroCostoCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(centroCostoCajaQuerySchema), centroCostoCajaController.getAll);
router.get("/:id", validateParams(idSchema), centroCostoCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createCentroCostoCajaSchema),
  centroCostoCajaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updateCentroCostoCajaSchema),
  centroCostoCajaController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  centroCostoCajaController.remove,
);

export default router;
