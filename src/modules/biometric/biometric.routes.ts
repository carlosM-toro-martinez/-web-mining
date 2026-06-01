import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { biometricController } from "./biometric.controller.js";

const router = Router();
router.use(authenticate);

const ROLES = ["ADMIN", "ADMINISTRADOR", "SUPERINTENDENTE"] as const;

// GET  /api/biometric/status — cualquier usuario autenticado
router.get("/status", biometricController.deviceStatus);

// GET  /api/biometric/attendance — cualquier usuario autenticado
router.get("/attendance", biometricController.getAttendance);

// GET  /api/biometric/device-users
router.get("/device-users", authorize(...ROLES), biometricController.deviceUsers);

// GET  /api/biometric/pending-commands
router.get("/pending-commands", authorize(...ROLES), biometricController.pendingCommands);

// POST /api/biometric/request-device-users
router.post("/request-device-users", authorize(...ROLES), biometricController.requestDeviceUsers);

// POST /api/biometric/sync-attendance
router.post("/sync-attendance", authorize(...ROLES), biometricController.syncAttendance);

export default router;
