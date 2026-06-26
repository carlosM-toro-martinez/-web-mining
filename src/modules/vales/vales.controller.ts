import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { valesService } from "./vales.service.js";
import { valeQuerySchema } from "./vales.schema.js";

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
      const query = valeQuerySchema.parse(req.query);
      const result = await valesService.getVales(query, req.user!.id, String(req.user!.role ?? ""));
      res.json({ success: true, data: result.vales, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getHistorialSolicitante(req: AuthRequest, res: Response) {
    try {
      const solicitanteId = parseInt(String(req.params.userId));
      if (isNaN(solicitanteId)) {
        return res.status(400).json({ success: false, error: "userId inválido" });
      }
      const page = req.query.page ? parseInt(String(req.query.page)) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 10;
      const result = await valesService.getHistorialSolicitante(solicitanteId, page, limit);
      res.json({ success: true, data: result.vales, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getValeById(req: AuthRequest, res: Response) {
    try {
      const vale = await valesService.getValeById(String(req.params.id));
      if (!vale) return res.status(404).json({ success: false, error: "Vale no encontrado" });
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

  async getResumenSolicitantes(_req: AuthRequest, res: Response) {
    try {
      const data = await valesService.getResumenSolicitantes();
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getProductosUsuario(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(String(req.params.userId));
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "userId inválido" });
      }
      const data = await valesService.getProductosPorUsuario(userId);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
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

  async anularVale(req: AuthRequest, res: Response) {
    try {
      const { motivo } = req.body ?? {};
      if (!motivo || String(motivo).trim().length < 5) {
        return res.status(400).json({ success: false, error: "El motivo es obligatorio (mínimo 5 caracteres)" });
      }
      const result = await valesService.anularVale(String(req.params.id), String(motivo).trim(), req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getAnulaciones(_req: AuthRequest, res: Response) {
    try {
      const data = await valesService.getAnulaciones();
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
