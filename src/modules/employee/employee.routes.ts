import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermiso } from "../../middleware/permiso.middleware.js";
import { employeeController } from "./employee.controller.js";

const router = Router();
router.use(authenticate);

// GET  /api/employees
router.get("/", requirePermiso("personal.empleados", "ver"), employeeController.getAll);

// GET  /api/employees/:id
router.get("/:id", requirePermiso("personal.empleados", "ver"), employeeController.getById);

// POST /api/employees
router.post("/", requirePermiso("personal.empleados", "crear"), employeeController.create);

// PUT  /api/employees/:id
router.put("/:id", requirePermiso("personal.empleados", "editar"), employeeController.update);

// DELETE /api/employees/:id
router.delete("/:id", requirePermiso("personal.empleados", "eliminar"), employeeController.remove);

// POST /api/employees/sync-device — reencola empleados pendientes al biométrico
router.post("/sync-device", requirePermiso("personal.biometrico", "sincronizar"), employeeController.syncPending);

export default router;
