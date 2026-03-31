import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { movimientoController } from "./movimiento.controller.js";
import { createSalidaSchema } from "./movimiento.schema.js";

const router = Router();

router.use(authenticate);

router.post(
  "/salidas",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  validate(createSalidaSchema),
  movimientoController.createSalida,
);

export default router;

