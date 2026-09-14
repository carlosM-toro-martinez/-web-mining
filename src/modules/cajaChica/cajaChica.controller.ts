import type { Response } from "express";
import { cajaChicaService } from "./cajaChica.service.js";
import { cajaChicaQuerySchema } from "./cajaChica.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const cajaChicaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = cajaChicaQuerySchema.parse(req.query);
      const data = await cajaChicaService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const caja = await cajaChicaService.getById(id);

      if (!caja) {
        return res.status(404).json({ success: false, error: "Caja chica no encontrada" });
      }

      res.json({ success: true, data: caja });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const caja = await cajaChicaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: caja });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const caja = await cajaChicaService.update(id, req.body, req.user!.id);
      res.json({ success: true, data: caja });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await cajaChicaService.remove(id, req.user!.id);
      res.status(204).json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
