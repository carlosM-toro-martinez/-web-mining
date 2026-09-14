import type { Response } from "express";
import { movimientoFondoCajaService } from "./movimientoFondoCaja.service.js";
import { movimientoFondoCajaQuerySchema } from "./movimientoFondoCaja.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const movimientoFondoCajaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Ver nota en gastoCaja.controller.ts: validateQuery() no persiste la
      // coerción de zod en req.query (getter de solo lectura en Express 5).
      const query = movimientoFondoCajaQuerySchema.parse(req.query);
      const data = await movimientoFondoCajaService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const movimiento = await movimientoFondoCajaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: movimiento });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
