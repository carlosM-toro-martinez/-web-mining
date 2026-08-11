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

  async createEntrada(req: AuthRequest, res: Response) {
    try {
      const data = await movimientoService.createEntrada(req.body, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async reordenarMovimientos(req: AuthRequest, res: Response) {
    try {
      const { productoId, anio, mes } = req.body as { productoId?: number; anio: unknown; mes: unknown };
      const anioN = Number(anio);
      const mesN  = Number(mes);
      if (!Number.isInteger(anioN) || anioN < 2000 || anioN > 2100 ||
          !Number.isInteger(mesN)  || mesN  < 1    || mesN  > 12) {
        res.status(400).json({ success: false, error: "anio y mes son requeridos y deben ser válidos." });
        return;
      }
      const payload: { anio: number; mes: number; productoId?: number } = { anio: anioN, mes: mesN };
      if (productoId !== undefined) payload.productoId = Number(productoId);
      const data = await movimientoService.reordenarMovimientos(payload);
      res.status(200).json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
