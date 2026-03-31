import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { movimientoService } from "./movimiento.service.js";

export const movimientoController = {
  async createSalida(req: AuthRequest, res: Response) {
    try {
      const data = await movimientoService.createSalida(req.body, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};

