import type { Response } from "express";
import { productoService } from "./producto.service.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";

export const productoController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const result = await productoService.getAll(req.query);
      res.json({ success: true, data: result.productos, meta: result.meta });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const producto = await productoService.getById(id);

      if (!producto) {
        return res.status(404).json({ success: false, error: "Producto no encontrado" });
      }

      res.json({ success: true, data: producto });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const producto = await productoService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: producto });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const producto = await productoService.update(id, req.body, req.user!.id);
      res.json({ success: true, data: producto });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await productoService.remove(id, req.user!.id);
      res.status(204).json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },
};
