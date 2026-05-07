import { Router } from "express";
import { EmployeeController } from "./employee.controller.js";

const router = Router();
const employeeController = new EmployeeController();

router.post("/", employeeController.createEmployee.bind(employeeController));
router.get("/", employeeController.getAllEmployees.bind(employeeController));
router.get("/:id", employeeController.getEmployeeById.bind(employeeController));
router.put("/:id", employeeController.updateEmployee.bind(employeeController));
router.delete("/:id", employeeController.deleteEmployee.bind(employeeController));

export default router;
