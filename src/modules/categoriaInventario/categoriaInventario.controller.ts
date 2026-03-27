import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { categoriaInventarioService } from "./categoriaInventario.service.js";
import { HttpError } from "../../errors/http.error.js";

export const categoriaInventarioController = {
  async getTree(_req: AuthRequest, res: Response) {
    try {
      const categorias = await categoriaInventarioService.getTree();
      res.json({ success: true, data: categorias });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getAll(req: AuthRequest, res: Response) {
    try {
      const categorias = await categoriaInventarioService.getAll(req.query);
      res.json({ success: true, data: categorias });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const categoria = await categoriaInventarioService.getById(id);

      if (!categoria) {
        return res.status(404).json({ success: false, error: "Categoría no encontrada" });
      }

      res.json({ success: true, data: categoria });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const categoria = await categoriaInventarioService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: categoria });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const categoria = await categoriaInventarioService.update(id, req.body, req.user!.id);
      res.json({ success: true, data: categoria });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await categoriaInventarioService.remove(id, req.user!.id);
      res.status(204).json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};

