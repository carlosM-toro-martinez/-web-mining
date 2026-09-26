import { Router } from "express";
import { liquidacionController } from "./liquidacion.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  agregarItemConceptoSchema,
  anularLiquidacionSchema,
  createLiquidacionSchema,
  liquidacionQuerySchema,
  previewLiquidacionQuerySchema,
} from "./liquidacion.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });
const idConItemSchema = z.object({ id: z.string().uuid(), itemId: z.string().uuid() });

const router = Router();

router.use(authenticate);

// Registrada ANTES de "/:id" — si no, Express la tomaría como un id.
router.get("/preview", validateQuery(previewLiquidacionQuerySchema), liquidacionController.preview);

router.get("/", validateQuery(liquidacionQuerySchema), liquidacionController.getAll);
router.get("/:id", validateParams(idSchema), liquidacionController.getById);

router.post(
  "/",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validate(createLiquidacionSchema),
  liquidacionController.create,
);

router.post(
  "/:id/items-concepto",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idSchema),
  validate(agregarItemConceptoSchema),
  liquidacionController.agregarItemConcepto,
);

router.delete(
  "/:id/items-concepto/:itemId",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateParams(idConItemSchema),
  liquidacionController.quitarItemConcepto,
);

// Cierre y anulación quedan reservados a ADMIN/SUPERINTENDENTE: mueven
// dinero y el estado final de los lotes, igual que el cierre de mes de inventario.
router.post(
  "/:id/cerrar",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  liquidacionController.cerrar,
);

router.post(
  "/:id/anular",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(anularLiquidacionSchema),
  liquidacionController.anular,
);

export default router;
