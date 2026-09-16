import { Router } from "express";
import { formulario101Controller } from "./formulario101.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  anularFormulario101Schema,
  formulario101QuerySchema,
  reutilizarFormulario101Schema,
  vincularFormulario101Schema,
} from "./formulario101.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });
const loteIdSchema = z.object({ loteId: z.string().uuid() });

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(formulario101QuerySchema), formulario101Controller.getAll);
router.get("/:id", validateParams(idSchema), formulario101Controller.getById);

router.post(
  "/vincular/:loteId",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(loteIdSchema),
  validate(vincularFormulario101Schema),
  formulario101Controller.vincular,
);

router.post(
  "/:id/reutilizar",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(reutilizarFormulario101Schema),
  formulario101Controller.reutilizar,
);

router.post(
  "/:id/anular",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(anularFormulario101Schema),
  formulario101Controller.anular,
);

router.post(
  "/:id/peticion-enviada",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  formulario101Controller.marcarPeticionEnviada,
);

export default router;
