import { Router } from "express";
import { choferController } from "./chofer.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createChoferSchema, updateChoferSchema, choferQuerySchema } from "./chofer.schema.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireModulo, requirePermiso } from "../../middleware/permiso.middleware.js";
import { z } from "zod";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

router.use(authenticate);
// Leer requiere algún permiso de logística; cada acción, su permiso propio
// (ver src/modules/roles/permisos.catalogo.ts).
router.use(requireModulo("logistica"));

router.get("/", validateQuery(choferQuerySchema), choferController.getAll);
router.get("/:id", validateParams(idSchema), choferController.getById);

router.post(
  "/",
  requirePermiso("logistica.flota", "crear"),
  validate(createChoferSchema),
  choferController.create,
);

router.put(
  "/:id",
  requirePermiso("logistica.flota", "editar"),
  validateParams(idSchema),
  validate(updateChoferSchema),
  choferController.update,
);

export default router;
