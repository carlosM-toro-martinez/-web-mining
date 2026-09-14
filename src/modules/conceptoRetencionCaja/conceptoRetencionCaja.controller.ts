import type { Response } from "express";
import { conceptoRetencionCajaService } from "./conceptoRetencionCaja.service.js";
import { conceptoRetencionCajaQuerySchema } from "./conceptoRetencionCaja.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const conceptoRetencionCajaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = conceptoRetencionCajaQuerySchema.parse(req.query);
      const data = await conceptoRetencionCajaService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const concepto = await conceptoRetencionCajaService.getById(id);

      if (!concepto) {
        return res.status(404).json({ success: false, error: "Concepto de retención no encontrado" });
      }

      res.json({ success: true, data: concepto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const concepto = await conceptoRetencionCajaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: concepto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const concepto = await conceptoRetencionCajaService.update(id, req.body, req.user!.id);
      res.json({ success: true, data: concepto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
