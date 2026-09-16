import { Router } from "express";
import { reportesCajaChicaController } from "./reportesCajaChica.controller.js";
import { validateQuery } from "../../middleware/validate.middleware.js";
import {
  estadoCuentaBancariaQuerySchema,
  estadoCuentaCajaQuerySchema,
  reporteCajaChicaQuerySchema,
} from "./reportesCajaChica.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"));

router.get("/retenciones", validateQuery(reporteCajaChicaQuerySchema), reportesCajaChicaController.getRetenciones);
router.get("/no-deducibles", validateQuery(reporteCajaChicaQuerySchema), reportesCajaChicaController.getNoDeducibles);
router.get("/desglose", validateQuery(reporteCajaChicaQuerySchema), reportesCajaChicaController.getDesglose);
router.get(
  "/estado-cuenta",
  validateQuery(estadoCuentaCajaQuerySchema),
  reportesCajaChicaController.getEstadoCuenta,
);
router.get(
  "/estado-cuenta-bancaria",
  validateQuery(estadoCuentaBancariaQuerySchema),
  reportesCajaChicaController.getEstadoCuentaBancaria,
);
router.get("/rendicion/:rendicionId", reportesCajaChicaController.getReporteRendicion);
router.get("/rendicion/:rendicionId/comprobante-diario", reportesCajaChicaController.getComprobanteDiario);

export default router;
