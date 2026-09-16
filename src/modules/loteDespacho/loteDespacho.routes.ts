import { Router } from "express";
import { loteDespachoController } from "./loteDespacho.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  anularLoteSchema,
  avanzarEstadoLoteSchema,
  createLoteDespachoSchema,
  loteDespachoQuerySchema,
  registrarPesajeSchema,
  transbordarLoteSchema,
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

router.post(
  "/:id/transbordo",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO", "ALMACENERO"),
  validateParams(idSchema),
  validate(transbordarLoteSchema),
  loteDespachoController.transbordar,
);

export default router;
