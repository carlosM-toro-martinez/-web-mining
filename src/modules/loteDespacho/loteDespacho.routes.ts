import { Router } from "express";
import multer from "multer";
import { loteDespachoController } from "./loteDespacho.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  anularLoteSchema,
  avanzarEstadoLoteSchema,
  corregirEstadoLoteSchema,
  createLoteDespachoSchema,
  loteDespachoQuerySchema,
  registrarCombustibleEntregadoSchema,
  registrarPesajeSchema,
  transbordarLoteSchema,
  updateLoteDespachoSchema,
} from "./loteDespacho.schema.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireModulo, requirePermiso } from "../../middleware/permiso.middleware.js";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.endsWith(".xls") ||
      file.originalname.endsWith(".xlsx");
    ok ? cb(null, true) : cb(new Error("Solo se aceptan archivos .xls o .xlsx"));
  },
});

const router = Router();

router.use(authenticate);
// Leer requiere algún permiso de logística; cada acción, su permiso propio
// (ver src/modules/roles/permisos.catalogo.ts).
router.use(requireModulo("logistica"));

// POST /api/lotes-despacho/importar-historico
// Carga masiva de lotes YA COMPLETADOS desde el Cuadro de Envío en Excel
// (ver loteDespachoImport.parser.ts para el formato esperado).
router.post(
  "/importar-historico",
  requirePermiso("logistica.lotes", "importar"),
  upload.single("file"),
  loteDespachoController.importarHistorico,
);

router.get("/", validateQuery(loteDespachoQuerySchema), loteDespachoController.getAll);
router.get("/:id", validateParams(idSchema), loteDespachoController.getById);

router.post(
  "/",
  requirePermiso("logistica.lotes", "crear"),
  validate(createLoteDespachoSchema),
  loteDespachoController.create,
);

router.patch(
  "/:id",
  requirePermiso("logistica.lotes", "editar"),
  validateParams(idSchema),
  validate(updateLoteDespachoSchema),
  loteDespachoController.update,
);

router.patch(
  "/:id/estado",
  requirePermiso("logistica.lotes", "editar"),
  validateParams(idSchema),
  validate(avanzarEstadoLoteSchema),
  loteDespachoController.avanzarEstado,
);

router.patch(
  "/:id/corregir-estado",
  requirePermiso("logistica.lotes", "editar"),
  validateParams(idSchema),
  validate(corregirEstadoLoteSchema),
  loteDespachoController.corregirEstado,
);

router.post(
  "/:id/pesaje",
  requirePermiso("logistica.lotes", "editar"),
  validateParams(idSchema),
  validate(registrarPesajeSchema),
  loteDespachoController.registrarPesaje,
);

router.post(
  "/:id/combustible-entregado",
  requirePermiso("logistica.lotes", "editar"),
  validateParams(idSchema),
  validate(registrarCombustibleEntregadoSchema),
  loteDespachoController.registrarCombustibleEntregado,
);

router.post(
  "/:id/anular",
  requirePermiso("logistica.lotes", "anular"),
  validateParams(idSchema),
  validate(anularLoteSchema),
  loteDespachoController.anular,
);

router.post(
  "/:id/transbordo",
  requirePermiso("logistica.lotes", "editar"),
  validateParams(idSchema),
  validate(transbordarLoteSchema),
  loteDespachoController.transbordar,
);

export default router;
