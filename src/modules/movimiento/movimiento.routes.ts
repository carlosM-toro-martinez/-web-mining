import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { movimientoController } from "./movimiento.controller.js";
import { createSalidaSchema, createEntradaSchema } from "./movimiento.schema.js";

const router = Router();

router.use(authenticate);

router.post(
  "/salidas",
  requirePermiso("inventario.stock", "movimientos_manuales"),
  validate(createSalidaSchema),
  movimientoController.createSalida,
);

router.post(
  "/entradas",
  requirePermiso("inventario.stock", "movimientos_manuales"),
  validate(createEntradaSchema),
  movimientoController.createEntrada,
);

// Rehace solo stockAntes/stockDespues/saldoBs del mes en orden cronológico (simulación por defecto).
router.post(
  "/reconstruir-cadena",
  authorize("ADMIN"),
  movimientoController.reconstruirCadena,
);

export default router;
