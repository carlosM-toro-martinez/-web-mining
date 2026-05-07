import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { valesService } from "./vales.service.js";

export const valesController = {
  async createVale(req: AuthRequest, res: Response) {
    try {
      const vale = await valesService.createVale(req.body, req.user!.id);
      res.status(201).json({ success: true, data: vale });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getVales(req: AuthRequest, res: Response) {
    try {
      const result = await valesService.getVales(req.query as any, req.user!.id);
      res.json({ success: true, data: result.vales, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getValeById(req: AuthRequest, res: Response) {
    try {
      const vale = await valesService.getValeById(String(req.params.id));

      if (!vale) {
        return res.status(404).json({ success: false, error: "Vale no encontrado" });
      }

      res.json({ success: true, data: vale });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async aprobarVale(req: AuthRequest, res: Response) {
    try {
      const vale = await valesService.aprobarVale(String(req.params.id), req.body, req.user!.id);
      res.json({ success: true, data: vale });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async entregarVale(req: AuthRequest, res: Response) {
    try {
      const result = await valesService.entregarVale(String(req.params.id), req.body, req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async rechazarVale(req: AuthRequest, res: Response) {
    try {
      const vale = await valesService.rechazarVale(String(req.params.id), req.user!.id);
      res.json({ success: true, data: vale });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
