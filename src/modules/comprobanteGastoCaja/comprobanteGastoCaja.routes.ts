import { Router } from "express";
import { comprobanteGastoCajaController } from "./comprobanteGastoCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createComprobanteGastoCajaSchema,
  updateComprobanteGastoCajaSchema,
  comprobanteGastoCajaQuerySchema,
} from "./comprobanteGastoCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(comprobanteGastoCajaQuerySchema), comprobanteGastoCajaController.getAll);
router.get("/:id", validateParams(idSchema), comprobanteGastoCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createComprobanteGastoCajaSchema),
  comprobanteGastoCajaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updateComprobanteGastoCajaSchema),
  comprobanteGastoCajaController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  comprobanteGastoCajaController.remove,
);

export default router;
