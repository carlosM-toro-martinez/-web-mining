import { Router } from "express";
import { gastoCajaController } from "./gastoCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  anularGastoCajaSchema,
  createGastoCajaSchema,
  gastoCajaQuerySchema,
  updateGastoCajaSchema,
} from "./gastoCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(gastoCajaQuerySchema), gastoCajaController.getAll);
router.get("/:id", validateParams(idSchema), gastoCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createGastoCajaSchema),
  gastoCajaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updateGastoCajaSchema),
  gastoCajaController.update,
);

router.post(
  "/:id/anular",
  authorize("ADMIN", "ADMINISTRADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(anularGastoCajaSchema),
  gastoCajaController.anular,
);

export default router;
