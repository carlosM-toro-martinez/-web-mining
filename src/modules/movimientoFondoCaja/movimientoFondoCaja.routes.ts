import { Router } from "express";
import { movimientoFondoCajaController } from "./movimientoFondoCaja.controller.js";
import { validate, validateQuery } from "../../middleware/validate.middleware.js";
import {
  createMovimientoFondoCajaSchema,
  movimientoFondoCajaQuerySchema,
} from "./movimientoFondoCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(movimientoFondoCajaQuerySchema), movimientoFondoCajaController.getAll);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createMovimientoFondoCajaSchema),
  movimientoFondoCajaController.create,
);

export default router;
