import type { Response } from "express";
import { rendicionCajaService } from "./rendicionCaja.service.js";
import { rendicionCajaQuerySchema } from "./rendicionCaja.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const rendicionCajaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Ver nota en gastoCaja.controller.ts: validateQuery() no puede
      // persistir la coerción de zod en req.query (getter de solo lectura
      // en Express 5), así que se vuelve a parsear aquí para que cajaId
      // llegue a Prisma como Number y no como string.
      const query = rendicionCajaQuerySchema.parse(req.query);
      const data = await rendicionCajaService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const rendicion = await rendicionCajaService.getById(req.params.id as string);
      if (!rendicion) {
        return res.status(404).json({ success: false, error: "Rendición no encontrada" });
      }
      res.json({ success: true, data: rendicion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const rendicion = await rendicionCajaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: rendicion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async cerrar(req: AuthRequest, res: Response) {
    try {
      const rendicion = await rendicionCajaService.cerrar(req.params.id as string, req.user!.id);
      res.json({ success: true, data: rendicion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async anular(req: AuthRequest, res: Response) {
    try {
      const rendicion = await rendicionCajaService.anular(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: rendicion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
