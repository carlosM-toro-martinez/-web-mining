import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { pedidosService } from "./pedidos.service.js";

export const pedidosController = {
  async createPedido(req: AuthRequest, res: Response) {
    try {
      const pedido = await pedidosService.createPedido(req.body, req.user!.id);
      res.status(201).json({ success: true, data: pedido });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getPedidos(req: AuthRequest, res: Response) {
    try {
      const result = await pedidosService.getPedidos(req.query as any);
      res.json({ success: true, data: result.pedidos, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getPedidoById(req: AuthRequest, res: Response) {
    try {
      const pedido = await pedidosService.getPedidoById(String(req.params.id));
      res.json({ success: true, data: pedido });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async cancelarPedido(req: AuthRequest, res: Response) {
    try {
      const pedido = await pedidosService.cancelarPedido(String(req.params.id), req.user!.id);
      res.json({ success: true, data: pedido });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
