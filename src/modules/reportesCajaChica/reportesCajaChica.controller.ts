import type { Response } from "express";
import { reportesCajaChicaService } from "./reportesCajaChica.service.js";
import {
  estadoCuentaBancariaQuerySchema,
  estadoCuentaCajaQuerySchema,
  reporteCajaChicaQuerySchema,
  reportePrevioRendicionQuerySchema,
} from "./reportesCajaChica.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const reportesCajaChicaController = {
  async getRetenciones(req: AuthRequest, res: Response) {
    try {
      // Ver nota en gastoCaja.controller.ts: validateQuery() no puede
      // persistir la coerción de zod en req.query (getter de solo lectura
      // en Express 5), así que se vuelve a parsear aquí para que cajaId
      // sea Number y fechaInicio/fechaFin sean Date antes de llegar a Prisma.
      const query = reporteCajaChicaQuerySchema.parse(req.query);
      const data = await reportesCajaChicaService.getRetenciones(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getImpuestos(req: AuthRequest, res: Response) {
    try {
      const query = reporteCajaChicaQuerySchema.parse(req.query);
      const data = await reportesCajaChicaService.getImpuestos(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getNoDeducibles(req: AuthRequest, res: Response) {
    try {
      const query = reporteCajaChicaQuerySchema.parse(req.query);
      const data = await reportesCajaChicaService.getNoDeducibles(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getDesglose(req: AuthRequest, res: Response) {
    try {
      const query = reporteCajaChicaQuerySchema.parse(req.query);
      const data = await reportesCajaChicaService.getDesglose(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getEstadoCuenta(req: AuthRequest, res: Response) {
    try {
      const query = estadoCuentaCajaQuerySchema.parse(req.query);
      const data = await reportesCajaChicaService.getEstadoCuenta(query.cajaId, query.fechaInicio, query.fechaFin);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getEstadoCuentaBancaria(req: AuthRequest, res: Response) {
    try {
      const query = estadoCuentaBancariaQuerySchema.parse(req.query);
      const data = await reportesCajaChicaService.getEstadoCuentaBancaria(
        query.cuentaBancariaId,
        query.fechaInicio,
        query.fechaFin,
      );
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getReportePrevio(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es de solo lectura, se vuelve a parsear aquí.
      const query = reportePrevioRendicionQuerySchema.parse(req.query);
      const data = await reportesCajaChicaService.getReportePrevio(query.cajaId, query.periodoDesde, query.periodoHasta);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getReporteRendicion(req: AuthRequest, res: Response) {
    try {
      const data = await reportesCajaChicaService.getReporteRendicion(req.params.rendicionId as string);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getComprobanteDiario(req: AuthRequest, res: Response) {
    try {
      const data = await reportesCajaChicaService.getComprobanteDiario(req.params.rendicionId as string);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getComprobanteEgresoGasto(req: AuthRequest, res: Response) {
    try {
      const data = await reportesCajaChicaService.getComprobanteEgresoGasto(req.params.gastoId as string, req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
