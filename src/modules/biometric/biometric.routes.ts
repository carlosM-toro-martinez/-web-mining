import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { biometricController } from "./biometric.controller.js";

const router = Router();
router.use(authenticate);

// GET  /api/biometric/status           — Estado del dispositivo (última vez visto)
router.get("/status", biometricController.deviceStatus);

// GET  /api/biometric/attendance       — Listar marcas de asistencia con filtros
router.get("/attendance", biometricController.getAttendance);

// GET  /api/biometric/device-users     — Empleados confirmados en el dispositivo
router.get("/device-users", authorize("ADMIN", "ALMACENERO"), biometricController.deviceUsers);

// GET  /api/biometric/pending-commands — Ver comandos ADMS pendientes de enviar
router.get("/pending-commands", authorize("ADMIN", "ALMACENERO"), biometricController.pendingCommands);

// POST /api/biometric/request-device-users — Importar usuarios del dispositivo a la BD
router.post("/request-device-users", authorize("ADMIN", "ALMACENERO"), biometricController.requestDeviceUsers);

export default router;
