import type { Response } from "express";
import { loteDespachoService } from "./loteDespacho.service.js";
import { loteDespachoQuerySchema } from "./loteDespacho.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const loteDespachoController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = loteDespachoQuerySchema.parse(req.query);
      const result = await loteDespachoService.getAll(query);
      res.json({ success: true, data: result.lotes, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const lote = await loteDespachoService.getById(req.params.id as string);
      if (!lote) {
        return res.status(404).json({ success: false, error: "Lote no encontrado" });
      }
      res.json({ success: true, data: lote });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const lote = await loteDespachoService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: lote });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async avanzarEstado(req: AuthRequest, res: Response) {
    try {
      const lote = await loteDespachoService.avanzarEstado(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: lote });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async registrarPesaje(req: AuthRequest, res: Response) {
    try {
      const lote = await loteDespachoService.registrarPesaje(req.params.id as string, req.body, req.user!.id);
      res.status(201).json({ success: true, data: lote });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async anular(req: AuthRequest, res: Response) {
    try {
      const lote = await loteDespachoService.anular(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: lote });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async transbordar(req: AuthRequest, res: Response) {
    try {
      const lote = await loteDespachoService.transbordar(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: lote });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
