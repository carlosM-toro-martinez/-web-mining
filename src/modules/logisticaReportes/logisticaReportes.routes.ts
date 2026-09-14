import { Router } from "express";
import { logisticaReportesController } from "./logisticaReportes.controller.js";
import { validate, validateQuery } from "../../middleware/validate.middleware.js";
import {
  cierreMensualSchema,
  cierresQuerySchema,
  cuadroMensualQuerySchema,
} from "./logisticaReportes.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get(
  "/cuadro-mensual",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateQuery(cuadroMensualQuerySchema),
  logisticaReportesController.getCuadroMensual,
);

router.get(
  "/cierres",
  authorize("ADMIN", "SUPERINTENDENTE", "ASISTENTE_ADMINISTRATIVO"),
  validateQuery(cierresQuerySchema),
  logisticaReportesController.getCierres,
);

router.post(
  "/cierre-mensual",
  authorize("ADMIN", "SUPERINTENDENTE"),
  validate(cierreMensualSchema),
  logisticaReportesController.cerrarMes,
);

export default router;
