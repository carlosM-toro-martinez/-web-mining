import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";
import { employeeController } from "./employee.controller.js";

const router = Router();
router.use(authenticate);

const ROLES = ["ADMIN", "ADMINISTRADOR", "SUPERINTENDENTE"] as const;

// GET  /api/employees
router.get("/", authorize(...ROLES), employeeController.getAll);

// GET  /api/employees/:id
router.get("/:id", authorize(...ROLES), employeeController.getById);

// POST /api/employees
router.post("/", authorize(...ROLES), employeeController.create);

// PUT  /api/employees/:id
router.put("/:id", authorize(...ROLES), employeeController.update);

// DELETE /api/employees/:id
router.delete("/:id", authorize(...ROLES), employeeController.remove);

// POST /api/employees/sync-device
router.post("/sync-device", authorize(...ROLES), employeeController.syncPending);

export default router;
