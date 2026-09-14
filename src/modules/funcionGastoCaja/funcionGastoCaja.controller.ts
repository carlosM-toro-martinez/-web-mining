import type { Response } from "express";
import { funcionGastoCajaService } from "./funcionGastoCaja.service.js";
import { funcionGastoCajaQuerySchema } from "./funcionGastoCaja.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const funcionGastoCajaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = funcionGastoCajaQuerySchema.parse(req.query);
      const data = await funcionGastoCajaService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const funcion = await funcionGastoCajaService.getById(id);

      if (!funcion) {
        return res.status(404).json({ success: false, error: "Función de gasto no encontrada" });
      }

      res.json({ success: true, data: funcion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const funcion = await funcionGastoCajaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: funcion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const funcion = await funcionGastoCajaService.update(id, req.body, req.user!.id);
      res.json({ success: true, data: funcion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await funcionGastoCajaService.remove(id, req.user!.id);
      res.status(204).json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
