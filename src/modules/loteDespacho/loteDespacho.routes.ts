import { Router } from "express";
import { loteDespachoController } from "./loteDespacho.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  anularLoteSchema,
  avanzarEstadoLoteSchema,
  createLoteDespachoSchema,
  loteDespachoQuerySchema,
  registrarPesajeSchema,
  regularizarFormulario101Schema,
} from "./loteDespacho.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });

const router = Router();

router.use(authenticate);

router.get("/", validateQuery(loteDespachoQuerySchema), loteDespachoController.getAll);
router.get("/:id", validateParams(idSchema), loteDespachoController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO", "ALMACENERO"),
  validate(createLoteDespachoSchema),
  loteDespachoController.create,
);

router.patch(
  "/:id/regularizar-f101",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(regularizarFormulario101Schema),
  loteDespachoController.regularizarFormulario101,
);

router.patch(
  "/:id/estado",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO", "ALMACENERO"),
  validateParams(idSchema),
  validate(avanzarEstadoLoteSchema),
  loteDespachoController.avanzarEstado,
);

router.post(
  "/:id/pesaje",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO", "ALMACENERO"),
  validateParams(idSchema),
  validate(registrarPesajeSchema),
  loteDespachoController.registrarPesaje,
);

router.post(
  "/:id/anular",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(anularLoteSchema),
  loteDespachoController.anular,
);

export default router;
