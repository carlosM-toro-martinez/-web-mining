import { Router } from "express";
import { rendicionCajaController } from "./rendicionCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  anularRendicionCajaSchema,
  createRendicionCajaSchema,
  rendicionCajaQuerySchema,
} from "./rendicionCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(rendicionCajaQuerySchema), rendicionCajaController.getAll);
router.get("/:id", validateParams(idSchema), rendicionCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createRendicionCajaSchema),
  rendicionCajaController.create,
);

// Cierre y anulación quedan reservados a ADMIN/SUPERINTENDENTE: fijan el
// estado final de los gastos, igual que el cierre de liquidaciones en Logística.
router.post(
  "/:id/cerrar",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  rendicionCajaController.cerrar,
);

router.post(
  "/:id/anular",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(anularRendicionCajaSchema),
  rendicionCajaController.anular,
);

export default router;
