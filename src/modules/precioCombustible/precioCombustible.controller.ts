import type { Response } from "express";
import { precioCombustibleService } from "./precioCombustible.service.js";
import { precioCombustibleQuerySchema } from "./precioCombustible.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const precioCombustibleController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que tarifaLiquidacion.controller.ts).
      const query = precioCombustibleQuerySchema.parse(req.query);
      const data = await precioCombustibleService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const precio = await precioCombustibleService.getById(id);

      if (!precio) {
        return res.status(404).json({ success: false, error: "Precio de combustible no encontrado" });
      }

      res.json({ success: true, data: precio });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const precio = await precioCombustibleService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: precio });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
