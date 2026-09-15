import { Router } from "express";
import { movimientoBancoCajaController } from "./movimientoBancoCaja.controller.js";
import { validate, validateQuery } from "../../middleware/validate.middleware.js";
import { createMovimientoBancoCajaSchema, movimientoBancoCajaQuerySchema } from "./movimientoBancoCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(movimientoBancoCajaQuerySchema), movimientoBancoCajaController.getAll);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createMovimientoBancoCajaSchema),
  movimientoBancoCajaController.create,
);

export default router;
