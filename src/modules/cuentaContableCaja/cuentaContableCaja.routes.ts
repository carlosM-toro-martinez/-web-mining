import { Router } from "express";
import { cuentaContableCajaController } from "./cuentaContableCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createCuentaContableCajaSchema,
  updateCuentaContableCajaSchema,
  cuentaContableCajaQuerySchema,
} from "./cuentaContableCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(cuentaContableCajaQuerySchema), cuentaContableCajaController.getAll);
router.get("/:id", validateParams(idSchema), cuentaContableCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createCuentaContableCajaSchema),
  cuentaContableCajaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updateCuentaContableCajaSchema),
  cuentaContableCajaController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  cuentaContableCajaController.remove,
);

export default router;
