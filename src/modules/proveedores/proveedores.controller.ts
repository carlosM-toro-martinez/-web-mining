import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { proveedoresService } from "./proveedores.service.js";

export const proveedoresController = {
  async createProveedor(req: AuthRequest, res: Response) {
    try {
      const proveedor = await proveedoresService.createProveedor(req.body, req.user!.id);
      res.status(201).json({ success: true, data: proveedor });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getProveedores(req: AuthRequest, res: Response) {
    try {
      const result = await proveedoresService.getProveedores(req.query as any);
      res.json({ success: true, data: result.proveedores, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getProveedorById(req: AuthRequest, res: Response) {
    try {
      const proveedor = await proveedoresService.getProveedorById(Number(req.params.id));
      if (!proveedor) {
        return res.status(404).json({ success: false, error: "Proveedor no encontrado" });
      }
      res.json({ success: true, data: proveedor });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateProveedor(req: AuthRequest, res: Response) {
    try {
      const proveedor = await proveedoresService.updateProveedor(
        Number(req.params.id),
        req.body,
        req.user!.id,
      );
      res.json({ success: true, data: proveedor });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteProveedor(req: AuthRequest, res: Response) {
    try {
      const result = await proveedoresService.deleteProveedor(Number(req.params.id), req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
