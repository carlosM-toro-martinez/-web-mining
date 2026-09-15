import { Router } from "express";
import { partidaPresupuestoCajaController } from "./partidaPresupuestoCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createPartidaPresupuestoCajaSchema,
  updatePartidaPresupuestoCajaSchema,
  partidaPresupuestoCajaQuerySchema,
} from "./partidaPresupuestoCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(partidaPresupuestoCajaQuerySchema), partidaPresupuestoCajaController.getAll);
router.get("/:id", validateParams(idSchema), partidaPresupuestoCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createPartidaPresupuestoCajaSchema),
  partidaPresupuestoCajaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updatePartidaPresupuestoCajaSchema),
  partidaPresupuestoCajaController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  partidaPresupuestoCajaController.remove,
);

export default router;
