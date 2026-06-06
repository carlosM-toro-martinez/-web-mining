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

  async anularCompra(req: AuthRequest, res: Response) {
    try {
      const { motivo } = req.body;
      if (!motivo || typeof motivo !== "string" || motivo.trim() === "") {
        return res.status(400).json({ success: false, error: "El campo motivo es requerido" });
      }
      const result = await comprasService.anularCompra(
        String(req.params.id),
        motivo.trim(),
        req.user!.id,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getAnulaciones(_req: AuthRequest, res: Response) {
    try {
      const data = await comprasService.getAnulaciones();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },
};
