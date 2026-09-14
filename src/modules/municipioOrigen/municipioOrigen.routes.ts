import { Router } from "express";
import { municipioOrigenController } from "./municipioOrigen.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  createMunicipioOrigenSchema,
  updateMunicipioOrigenSchema,
  municipioOrigenQuerySchema,
} from "./municipioOrigen.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(municipioOrigenQuerySchema), municipioOrigenController.getAll);
router.get("/:id", validateParams(idSchema), municipioOrigenController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validate(createMunicipioOrigenSchema),
  municipioOrigenController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(updateMunicipioOrigenSchema),
  municipioOrigenController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  municipioOrigenController.remove,
);

export default router;
