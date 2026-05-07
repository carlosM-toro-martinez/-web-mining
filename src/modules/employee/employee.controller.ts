import type { Request, Response } from "express";
import { EmployeeService } from "./employee.service.js";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "./employee.types.js";

const employeeService = new EmployeeService();

export class EmployeeController {
  async createEmployee(req: Request, res: Response) {
    try {
      const data: CreateEmployeeInput = req.body;
      const employee = await employeeService.createEmployee(data);
      res.status(201).json(employee);
    } catch (error) {
      res.status(500).json({ error: "Error creating employee" });
    }
  }

  async getAllEmployees(req: Request, res: Response) {
    try {
      const employees = await employeeService.getAllEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Error fetching employees" });
    }
  }

  async getEmployeeById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const employee = await employeeService.getEmployeeById(id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Error fetching employee" });
    }
  }

  async updateEmployee(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const data: UpdateEmployeeInput = req.body;
      const employee = await employeeService.updateEmployee(id, data);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Error updating employee" });
    }
  }

  async deleteEmployee(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const deleted = await employeeService.deleteEmployee(id);
      if (!deleted) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error deleting employee" });
    }
  }
}
