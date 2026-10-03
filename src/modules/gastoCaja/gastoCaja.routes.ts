import { Router } from "express";
import multer from "multer";
import { gastoCajaController } from "./gastoCaja.controller.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.middleware.js";
import {
  anularGastoCajaSchema,
  createGastoCajaSchema,
  gastoCajaQuerySchema,
  updateGastoCajaSchema,
} from "./gastoCaja.schema.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
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

// POST /api/gastos-caja/importar-excel
// Carga masiva del reporte mensual "Caja Lipeña" (fondos recibidos +
// detalle de gastos) desde Excel (ver gastoCajaImport.parser.ts).
router.post(
  "/importar-excel",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  upload.single("file"),
  gastoCajaController.importarDesdeExcel,
);

router.get("/", validateQuery(gastoCajaQuerySchema), gastoCajaController.getAll);
router.get("/:id", validateParams(idSchema), gastoCajaController.getById);

router.post(
  "/",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validate(createGastoCajaSchema),
  gastoCajaController.create,
);

router.put(
  "/:id",
  authorize("ADMIN", "ADMINISTRADOR", "CONTADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(updateGastoCajaSchema),
  gastoCajaController.update,
);

router.post(
  "/:id/anular",
  authorize("ADMIN", "ADMINISTRADOR", "SUPERINTENDENTE"),
  validateParams(idSchema),
  validate(anularGastoCajaSchema),
  gastoCajaController.anular,
);

export default router;
