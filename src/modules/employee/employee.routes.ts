import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { employeeController } from "./employee.controller.js";

const router = Router();
router.use(authenticate);

// GET  /api/employees?search=&activo=&page=&limit=
router.get("/", employeeController.getAll);

// GET  /api/employees/:id
router.get("/:id", employeeController.getById);

// POST /api/employees
router.post("/", authorize("ADMIN", "ALMACENERO"), employeeController.create);

// PUT  /api/employees/:id
router.put("/:id", authorize("ADMIN", "ALMACENERO"), employeeController.update);

// DELETE /api/employees/:id
router.delete("/:id", authorize("ADMIN"), employeeController.remove);

// POST /api/employees/sync-device  — reintenta sincronizar empleados PENDING
router.post("/sync-device", authorize("ADMIN", "ALMACENERO"), employeeController.syncPending);

export default router;
