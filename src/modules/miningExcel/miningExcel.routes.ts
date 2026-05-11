import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.middleware.js";
import { miningExcelController } from "./miningExcel.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.endsWith(".xls") ||
      file.originalname.endsWith(".xlsx")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Solo se aceptan archivos .xls o .xlsx"));
    }
  },
});

const router = Router();
router.use(authenticate);

// POST /api/imports/mining-excel/validate  — dry run
router.post(
  "/validate",
  upload.single("file"),
  miningExcelController.validate,
);

// POST /api/imports/mining-excel/execute  — real import
router.post(
  "/execute",
  upload.single("file"),
  miningExcelController.execute,
);

export default router;
