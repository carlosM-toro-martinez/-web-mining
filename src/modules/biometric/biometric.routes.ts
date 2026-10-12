import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
import { biometricController } from "./biometric.controller.js";

const router = Router();
router.use(authenticate);

// GET  /api/biometric/status — estado de conexión del dispositivo
router.get("/status", requirePermiso("personal.biometrico", "ver_estado"), biometricController.deviceStatus);

// GET  /api/biometric/attendance — marcaciones en bruto
router.get("/attendance", requirePermiso("personal.asistencia", "ver"), biometricController.getAttendance);

// GET  /api/biometric/device-users
router.get("/device-users", requirePermiso("personal.biometrico", "ver"), biometricController.deviceUsers);

// GET  /api/biometric/pending-commands
router.get("/pending-commands", requirePermiso("personal.biometrico", "ver"), biometricController.pendingCommands);

// POST /api/biometric/request-device-users
router.post("/request-device-users", requirePermiso("personal.biometrico", "sincronizar"), biometricController.requestDeviceUsers);

// POST /api/biometric/sync-attendance
router.post("/sync-attendance", requirePermiso("personal.biometrico", "sincronizar"), biometricController.syncAttendance);

export default router;
