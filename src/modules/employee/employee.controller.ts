import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  syncPendingEmployees,
} from "./employee.service.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
  employeeIdSchema,
} from "./employee.schema.js";

export const employeeController = {
  async create(req: AuthRequest, res: Response) {
    try {
      const parsed = createEmployeeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const data = await createEmployee(parsed.data);
      res.status(201).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getAll(req: AuthRequest, res: Response) {
    try {
      const parsed = employeeQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Parámetros inválidos" });
      }
      const result = await getAllEmployees(parsed.data);
      res.json({ success: true, data: result.empleados, meta: result.meta });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const parsed = employeeIdSchema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "ID inválido" });
      }
      const data = await getEmployeeById(parsed.data.id);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const paramParsed = employeeIdSchema.safeParse(req.params);
      if (!paramParsed.success) {
        return res.status(400).json({ success: false, error: "ID inválido" });
      }
      const bodyParsed = updateEmployeeSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: bodyParsed.error.flatten() });
      }
      const data = await updateEmployee(paramParsed.data.id, bodyParsed.data);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      const parsed = employeeIdSchema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "ID inválido" });
      }
      await deleteEmployee(parsed.data.id);
      res.json({ success: true, data: { message: "Empleado eliminado" } });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async syncPending(req: AuthRequest, res: Response) {
    try {
      const data = await syncPendingEmployees();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },
};
