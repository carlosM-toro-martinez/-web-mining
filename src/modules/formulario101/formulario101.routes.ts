import { Router } from "express";
import { formulario101Controller } from "./formulario101.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  anularFormulario101Schema,
  formulario101QuerySchema,
  reutilizarFormulario101Schema,
  vincularFormulario101Schema,
} from "./formulario101.schema.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireModulo, requirePermiso } from "../../middleware/permiso.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });
const loteIdSchema = z.object({ loteId: z.string().uuid() });

const router = Router();

router.use(authenticate);
// Leer requiere algún permiso de logística; cada acción, su permiso propio
// (ver src/modules/roles/permisos.catalogo.ts).
router.use(requireModulo("logistica"));

router.get("/", validateQuery(formulario101QuerySchema), formulario101Controller.getAll);
router.get("/:id", validateParams(idSchema), formulario101Controller.getById);

router.post(
  "/vincular/:loteId",
  requirePermiso("logistica.f101", "gestionar"),
  validateParams(loteIdSchema),
  validate(vincularFormulario101Schema),
  formulario101Controller.vincular,
);

router.post(
  "/:id/reutilizar",
  requirePermiso("logistica.f101", "gestionar"),
  validateParams(idSchema),
  validate(reutilizarFormulario101Schema),
  formulario101Controller.reutilizar,
);

router.post(
  "/:id/anular",
  requirePermiso("logistica.f101", "anular"),
  validateParams(idSchema),
  validate(anularFormulario101Schema),
  formulario101Controller.anular,
);

router.post(
  "/:id/peticion-enviada",
  requirePermiso("logistica.f101", "gestionar"),
  validateParams(idSchema),
  formulario101Controller.marcarPeticionEnviada,
);

export default router;
