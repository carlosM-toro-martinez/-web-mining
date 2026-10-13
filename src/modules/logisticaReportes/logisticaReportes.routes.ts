import { Router } from "express";
import { logisticaReportesController } from "./logisticaReportes.controller.js";
import { validate, validateQuery } from "../../middleware/validate.middleware.js";
import {
  cierreMensualSchema,
  cierresQuerySchema,
  combustibleQuerySchema,
  cuadroMensualQuerySchema,
} from "./logisticaReportes.schema.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireModulo, requirePermiso } from "../../middleware/permiso.middleware.js";

const router = Router();

router.use(authenticate);
// Leer requiere algún permiso de logística; cada acción, su permiso propio
// (ver src/modules/roles/permisos.catalogo.ts).
router.use(requireModulo("logistica"));

router.get(
  "/cuadro-mensual",
  validateQuery(cuadroMensualQuerySchema),
  logisticaReportesController.getCuadroMensual,
);

router.get(
  "/integridad-correlativo",
  validateQuery(cuadroMensualQuerySchema),
  logisticaReportesController.getIntegridadCorrelativo,
);

router.get(
  "/combustible",
  validateQuery(combustibleQuerySchema),
  logisticaReportesController.getCombustibleReport,
);

router.get(
  "/cierres",
  validateQuery(cierresQuerySchema),
  logisticaReportesController.getCierres,
);

router.post(
  "/cierre-mensual",
  requirePermiso("logistica.reportes", "cerrar_mes"),
  validate(cierreMensualSchema),
  logisticaReportesController.cerrarMes,
);

export default router;
