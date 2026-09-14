import type { Response } from "express";
import { tarifaLiquidacionService } from "./tarifaLiquidacion.service.js";
import { tarifaLiquidacionQuerySchema } from "./tarifaLiquidacion.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const tarifaLiquidacionController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = tarifaLiquidacionQuerySchema.parse(req.query);
      const data = await tarifaLiquidacionService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const tarifa = await tarifaLiquidacionService.getById(id);

      if (!tarifa) {
        return res.status(404).json({ success: false, error: "Tarifa de liquidación no encontrada" });
      }

      res.json({ success: true, data: tarifa });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const tarifa = await tarifaLiquidacionService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: tarifa });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
