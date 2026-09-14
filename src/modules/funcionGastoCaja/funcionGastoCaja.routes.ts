import { Router } from "express";
import { funcionGastoCajaController } from "./funcionGastoCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createFuncionGastoCajaSchema,
  updateFuncionGastoCajaSchema,
  funcionGastoCajaQuerySchema,
} from "./funcionGastoCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(funcionGastoCajaQuerySchema), funcionGastoCajaController.getAll);
router.get("/:id", validateParams(idSchema), funcionGastoCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createFuncionGastoCajaSchema),
  funcionGastoCajaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updateFuncionGastoCajaSchema),
  funcionGastoCajaController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  funcionGastoCajaController.remove,
);

export default router;
