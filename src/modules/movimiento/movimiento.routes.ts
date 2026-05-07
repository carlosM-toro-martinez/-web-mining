import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { movimientoController } from "./movimiento.controller.js";
<<<<<<< HEAD
import { createSalidaSchema, createEntradaSchema } from "./movimiento.schema.js";
=======
import { createSalidaSchema } from "./movimiento.schema.js";
>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd

const router = Router();

router.use(authenticate);

router.post(
  "/salidas",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  validate(createSalidaSchema),
  movimientoController.createSalida,
);

<<<<<<< HEAD
router.post(
  "/entradas",
  authorize("ADMIN", "ALMACENERO", "SUPERINTENDENTE"),
  validate(createEntradaSchema),
  movimientoController.createEntrada,
);

export default router;
=======
export default router;

>>>>>>> be7654ce96cde142b1a747ccc1ee99fabacfb3cd
