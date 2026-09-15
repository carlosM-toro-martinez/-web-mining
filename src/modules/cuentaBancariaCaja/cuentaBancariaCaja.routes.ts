import { Router } from "express";
import { cuentaBancariaCajaController } from "./cuentaBancariaCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createCuentaBancariaCajaSchema,
  updateCuentaBancariaCajaSchema,
  cuentaBancariaCajaQuerySchema,
} from "./cuentaBancariaCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(cuentaBancariaCajaQuerySchema), cuentaBancariaCajaController.getAll);
router.get("/:id", validateParams(idSchema), cuentaBancariaCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createCuentaBancariaCajaSchema),
  cuentaBancariaCajaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updateCuentaBancariaCajaSchema),
  cuentaBancariaCajaController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  cuentaBancariaCajaController.remove,
);

export default router;
