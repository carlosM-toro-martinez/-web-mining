import { Router } from "express";
import { presupuestoCajaController } from "./presupuestoCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  asignarBancoPresupuestoCajaSchema,
  createPresupuestoCajaSchema,
  duplicarPresupuestoCajaSchema,
  presupuestoCajaQuerySchema,
  updatePresupuestoCajaSchema,
} from "./presupuestoCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(presupuestoCajaQuerySchema), presupuestoCajaController.getAll);
router.get("/:id", validateParams(idSchema), presupuestoCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createPresupuestoCajaSchema),
  presupuestoCajaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updatePresupuestoCajaSchema),
  presupuestoCajaController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  presupuestoCajaController.remove,
);

router.post(
  "/:id/asignar-banco",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(asignarBancoPresupuestoCajaSchema),
  presupuestoCajaController.asignarBanco,
);

router.post(
  "/:id/duplicar",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(duplicarPresupuestoCajaSchema),
  presupuestoCajaController.duplicar,
);

export default router;
