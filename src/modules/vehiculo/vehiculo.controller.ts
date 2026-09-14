import type { Response } from "express";
import { vehiculoService } from "./vehiculo.service.js";
import { vehiculoQuerySchema } from "./vehiculo.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const vehiculoController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = vehiculoQuerySchema.parse(req.query);
      const data = await vehiculoService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const vehiculo = await vehiculoService.getById(id);

      if (!vehiculo) {
        return res.status(404).json({ success: false, error: "Vehículo no encontrado" });
      }

      res.json({ success: true, data: vehiculo });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getHistorialEstados(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const data = await vehiculoService.getHistorialEstados(id);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const vehiculo = await vehiculoService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: vehiculo });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const vehiculo = await vehiculoService.update(id, req.body, req.user!.id);
      res.json({ success: true, data: vehiculo });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async cambiarEstado(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const vehiculo = await vehiculoService.cambiarEstado(id, req.body, req.user!.id);
      res.json({ success: true, data: vehiculo });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
