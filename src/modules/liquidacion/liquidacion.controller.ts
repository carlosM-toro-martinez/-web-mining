import type { Response } from "express";
import { liquidacionService } from "./liquidacion.service.js";
import { liquidacionQuerySchema } from "./liquidacion.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const liquidacionController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = liquidacionQuerySchema.parse(req.query);
      const data = await liquidacionService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const liquidacion = await liquidacionService.getById(req.params.id as string);
      if (!liquidacion) {
        return res.status(404).json({ success: false, error: "Liquidación no encontrada" });
      }
      res.json({ success: true, data: liquidacion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const liquidacion = await liquidacionService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: liquidacion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async agregarItemConcepto(req: AuthRequest, res: Response) {
    try {
      const item = await liquidacionService.agregarItemConcepto(
        req.params.id as string,
        req.body,
        req.user!.id,
      );
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async quitarItemConcepto(req: AuthRequest, res: Response) {
    try {
      await liquidacionService.quitarItemConcepto(
        req.params.id as string,
        req.params.itemId as string,
        req.user!.id,
      );
      res.status(204).json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async cerrar(req: AuthRequest, res: Response) {
    try {
      const liquidacion = await liquidacionService.cerrar(req.params.id as string, req.user!.id);
      res.json({ success: true, data: liquidacion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async anular(req: AuthRequest, res: Response) {
    try {
      const liquidacion = await liquidacionService.anular(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: liquidacion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
