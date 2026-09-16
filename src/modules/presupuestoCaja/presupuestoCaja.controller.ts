import type { Response } from "express";
import { presupuestoCajaService } from "./presupuestoCaja.service.js";
import { presupuestoCajaQuerySchema } from "./presupuestoCaja.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const presupuestoCajaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = presupuestoCajaQuerySchema.parse(req.query);
      const data = await presupuestoCajaService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const presupuesto = await presupuestoCajaService.getById(id);

      if (!presupuesto) {
        return res.status(404).json({ success: false, error: "Presupuesto (remesa) no encontrado" });
      }

      res.json({ success: true, data: presupuesto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const presupuesto = await presupuestoCajaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: presupuesto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const presupuesto = await presupuestoCajaService.update(id, req.body, req.user!.id);
      res.json({ success: true, data: presupuesto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await presupuestoCajaService.remove(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async asignarBanco(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const presupuesto = await presupuestoCajaService.asignarBanco(id, req.body, req.user!.id);
      res.json({ success: true, data: presupuesto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async duplicar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const presupuesto = await presupuestoCajaService.duplicar(id, req.body, req.user!.id);
      res.status(201).json({ success: true, data: presupuesto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
