import { Router } from "express";
import { movimientoBancoCajaController } from "./movimientoBancoCaja.controller.js";
import { z } from "zod";
import { validate, validateParams, validateQuery } from "../../middleware/validate.middleware.js";
import {
  anularMovimientoBancoCajaSchema,
  createMovimientoBancoCajaSchema,
  remesaRapidaSchema,
  movimientoBancoCajaQuerySchema,
  vincularPresupuestoSchema,
} from "./movimientoBancoCaja.schema.js";
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

router.patch(
  "/:id/presupuesto",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(z.object({ id: z.string().uuid() })),
  validate(vincularPresupuestoSchema),
  movimientoBancoCajaController.vincularPresupuesto,
);

router.post(
  "/:id/remesa",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(z.object({ id: z.string().uuid() })),
  validate(remesaRapidaSchema),
  movimientoBancoCajaController.crearRemesa,
);

router.post(
  "/:id/anular",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(z.object({ id: z.string().uuid() })),
  validate(anularMovimientoBancoCajaSchema),
  movimientoBancoCajaController.anular,
);

export default router;
