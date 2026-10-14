import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { cuadreSaldoService } from "./cuadreSaldo.service.js";
import { previsualizarCuadreSchema } from "./cuadreSaldo.schema.js";

function responderError(res: Response, error: unknown, statusPorDefecto = 400) {
  const status = error instanceof HttpError ? error.statusCode : statusPorDefecto;
  res.status(status).json({ success: false, error: (error as Error).message });
}

export const cuadreSaldoController = {
  async getAll(_req: AuthRequest, res: Response) {
    try {
      res.json({ success: true, data: await cuadreSaldoService.getAll() });
    } catch (error) {
      responderError(res, error, 500);
    }
  },

  async previsualizar(req: AuthRequest, res: Response) {
    try {
      // Express 5: la coerción de validateQuery no persiste en req.query.
      const query = previsualizarCuadreSchema.parse(req.query);
      res.json({ success: true, data: await cuadreSaldoService.previsualizar(query) });
    } catch (error) {
      responderError(res, error);
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      res.status(201).json({ success: true, data: await cuadreSaldoService.create(req.body, req.user!.id) });
    } catch (error) {
      responderError(res, error);
    }
  },
};
