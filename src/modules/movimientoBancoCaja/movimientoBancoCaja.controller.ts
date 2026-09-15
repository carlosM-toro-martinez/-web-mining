import type { Response } from "express";
import { movimientoBancoCajaService } from "./movimientoBancoCaja.service.js";
import { movimientoBancoCajaQuerySchema } from "./movimientoBancoCaja.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const movimientoBancoCajaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = movimientoBancoCajaQuerySchema.parse(req.query);
      const data = await movimientoBancoCajaService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const movimiento = await movimientoBancoCajaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: movimiento });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
