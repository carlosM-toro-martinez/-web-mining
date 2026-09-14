import { Router } from "express";
import { cajaChicaController } from "./cajaChica.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createCajaChicaSchema, updateCajaChicaSchema, cajaChicaQuerySchema } from "./cajaChica.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(cajaChicaQuerySchema), cajaChicaController.getAll);
router.get("/:id", validateParams(idSchema), cajaChicaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createCajaChicaSchema),
  cajaChicaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updateCajaChicaSchema),
  cajaChicaController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  cajaChicaController.remove,
);

export default router;
