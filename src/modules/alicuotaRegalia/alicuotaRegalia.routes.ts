import { Router } from "express";
import { alicuotaRegaliaController } from "./alicuotaRegalia.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import { createAlicuotaRegaliaSchema, alicuotaRegaliaQuerySchema } from "./alicuotaRegalia.schema.js";
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

router.get("/", validateQuery(alicuotaRegaliaQuerySchema), alicuotaRegaliaController.getAll);
router.get("/:id", validateParams(idSchema), alicuotaRegaliaController.getById);

router.post(
  "/",
  requirePermiso("logistica.parametros", "crear"),
  validate(createAlicuotaRegaliaSchema),
  alicuotaRegaliaController.create,
);

export default router;
