import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { comprasService } from "./compras.service.js";

export const comprasController = {
  async createCompra(req: AuthRequest, res: Response) {
    try {
      const compra = await comprasService.createCompra(req.body, req.user!.id);
      res.status(201).json({ success: true, data: compra });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getCompras(req: AuthRequest, res: Response) {
    try {
      const result = await comprasService.getCompras(req.query as any, req.user!.id);
      res.json({ success: true, data: result.compras, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getCompraById(req: AuthRequest, res: Response) {
    try {
      const compra = await comprasService.getCompraById(String(req.params.id));

      if (!compra) {
        return res.status(404).json({ success: false, error: "Compra no encontrada" });
      }

      res.json({ success: true, data: compra });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async recibirCompra(req: AuthRequest, res: Response) {
    try {
      const result = await comprasService.recibirCompra(
        String(req.params.id),
        req.body,
        req.user!.id,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
