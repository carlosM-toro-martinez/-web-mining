import type { Response } from "express";
import { logisticaReportesService } from "./logisticaReportes.service.js";
import { cuadroMensualQuerySchema } from "./logisticaReportes.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const logisticaReportesController = {
  async getCuadroMensual(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = cuadroMensualQuerySchema.parse(req.query);
      const data = await logisticaReportesService.getCuadroMensual(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async cerrarMes(req: AuthRequest, res: Response) {
    try {
      const cierre = await logisticaReportesService.cerrarMes(req.body, req.user!.id);
      res.status(201).json({ success: true, data: cierre });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getCierres(req: AuthRequest, res: Response) {
    try {
      const municipioId = req.query.municipioId ? Number(req.query.municipioId) : undefined;
      const data = await logisticaReportesService.getCierres(municipioId);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
