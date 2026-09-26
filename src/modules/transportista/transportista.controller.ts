import type { Response } from "express";
import { transportistaService } from "./transportista.service.js";
import { transportistaQuerySchema } from "./transportista.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const transportistaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = transportistaQuerySchema.parse(req.query);
      const data = await transportistaService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const transportista = await transportistaService.getById(id);

      if (!transportista) {
        return res.status(404).json({ success: false, error: "Transportista no encontrado" });
      }

      res.json({ success: true, data: transportista });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const transportista = await transportistaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: transportista });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const transportista = await transportistaService.update(id, req.body, req.user!.id);
      res.json({ success: true, data: transportista });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await transportistaService.remove(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
