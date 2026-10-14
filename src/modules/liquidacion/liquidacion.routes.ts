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
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireModulo, requirePermiso } from "../../middleware/permiso.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });
const idConItemSchema = z.object({ id: z.string().uuid(), itemId: z.string().uuid() });

const router = Router();

router.use(authenticate);
// Leer requiere algún permiso de logística; cada acción, su permiso propio
// (ver src/modules/roles/permisos.catalogo.ts).
router.use(requireModulo("logistica"));

// Registrada ANTES de "/:id" — si no, Express la tomaría como un id.
router.get("/preview", validateQuery(previewLiquidacionQuerySchema), liquidacionController.preview);

router.get("/", validateQuery(liquidacionQuerySchema), liquidacionController.getAll);
router.get("/:id", validateParams(idSchema), liquidacionController.getById);

router.post(
  "/",
  requirePermiso("logistica.liquidaciones", "crear"),
  validate(createLiquidacionSchema),
  liquidacionController.create,
);

router.post(
  "/:id/items-concepto",
  requirePermiso("logistica.liquidaciones", "editar"),
  validateParams(idSchema),
  validate(agregarItemConceptoSchema),
  liquidacionController.agregarItemConcepto,
);

router.delete(
  "/:id/items-concepto/:itemId",
  requirePermiso("logistica.liquidaciones", "editar"),
  validateParams(idConItemSchema),
  liquidacionController.quitarItemConcepto,
);

// Cierre y anulación quedan reservados a ADMIN/SUPERINTENDENTE: mueven
// dinero y el estado final de los lotes, igual que el cierre de mes de inventario.
router.post(
  "/:id/cerrar",
  requirePermiso("logistica.liquidaciones", "cerrar"),
  validateParams(idSchema),
  liquidacionController.cerrar,
);

router.post(
  "/:id/anular",
  requirePermiso("logistica.liquidaciones", "anular"),
  validateParams(idSchema),
  validate(anularLiquidacionSchema),
  liquidacionController.anular,
);

// Eliminar (no anular) solo aplica a un BORRADOR — mismos roles que
// crearla, porque todavía no tuvo ningún efecto real que auditar.
router.delete(
  "/:id",
  requirePermiso("logistica.liquidaciones", "eliminar"),
  validateParams(idSchema),
  liquidacionController.eliminarBorrador,
);

export default router;
