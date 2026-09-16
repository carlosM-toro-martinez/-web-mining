import type { Response } from "express";
import { gastoCajaService } from "./gastoCaja.service.js";
import { gastoCajaQuerySchema } from "./gastoCaja.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const gastoCajaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // NOTA: validateQuery() solo valida con zod (safeParse) pero no puede
      // reescribir req.query con los valores coercidos porque en Express 5
      // req.query es un getter de solo lectura (se recalcula desde la URL
      // en cada acceso, ver node_modules/express/lib/request.js). Por eso
      // hay que volver a parsear aquí para obtener cajaId/fechas ya
      // convertidos a Number/Date antes de pasarlos a Prisma (mismo patrón
      // que logisticaReportes.controller.ts con `Number(req.query.x)`).
      const query = gastoCajaQuerySchema.parse(req.query);
      const result = await gastoCajaService.getAll(query);
      res.json({ success: true, data: result.gastos, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const gasto = await gastoCajaService.getById(req.params.id as string);
      if (!gasto) {
        return res.status(404).json({ success: false, error: "Gasto no encontrado" });
      }
      res.json({ success: true, data: gasto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const gasto = await gastoCajaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: gasto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const gasto = await gastoCajaService.update(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: gasto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async anular(req: AuthRequest, res: Response) {
    try {
      const gasto = await gastoCajaService.anular(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: gasto });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
