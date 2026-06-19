import type { Request, Response } from "express";
import { reportesService } from "./reportes.service.js";
import {
  binCardQuerySchema,
  stockQuerySchema,
  valesResumenQuerySchema,
  comprasResumenQuerySchema,
  periodoRangoQuerySchema,
} from "./reportes.schema.js";
import { HttpError } from "../../errors/http.error.js";

export const reportesController = {
  async getBinCard(req: Request, res: Response) {
    try {
      const query = binCardQuerySchema.parse(req.query);
      const result = await reportesService.getBinCard(query);
      res.json(result);
    } catch (error) {
      if (error instanceof HttpError) res.status(error.statusCode).json({ error: error.message });
      else res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  async getBinCardValorado(req: Request, res: Response) {
    try {
      const query = binCardQuerySchema.parse(req.query);
      const result = await reportesService.getBinCardValorado(query);
      res.json(result);
    } catch (error) {
      if (error instanceof HttpError) res.status(error.statusCode).json({ error: error.message });
      else res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  async getStockActual(req: Request, res: Response) {
    try {
      const query = stockQuerySchema.parse(req.query);
      const result = await reportesService.getStockActual(query);
      res.json({ success: true, data: result.items, meta: result.meta });
    } catch (error) {
      if (error instanceof HttpError) res.status(error.statusCode).json({ error: error.message });
      else res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  async getValesResumen(req: Request, res: Response) {
    try {
      const query = valesResumenQuerySchema.parse(req.query);
      const result = await reportesService.getValesResumen(query);
      res.json({ success: true, data: result.vales, meta: result.meta });
    } catch (error) {
      if (error instanceof HttpError) res.status(error.statusCode).json({ error: error.message });
      else res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  async getComprasResumen(req: Request, res: Response) {
    try {
      const query = comprasResumenQuerySchema.parse(req.query);
      const result = await reportesService.getComprasResumen(query);
      res.json({ success: true, data: result.compras, meta: result.meta });
    } catch (error) {
      if (error instanceof HttpError) res.status(error.statusCode).json({ error: error.message });
      else res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  async getBalanceMensual(req: Request, res: Response) {
    try {
      const parsed = periodoRangoQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Se requieren parámetros anioInicio, mesInicio, anioFin y mesFin válidos" });
      }
      const result = await reportesService.getBalanceMensual(parsed.data);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) res.status(error.statusCode).json({ error: error.message });
      else res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  async getInventarioAlmacen(req: Request, res: Response) {
    try {
      const parsed = periodoRangoQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Se requieren parámetros anioInicio, mesInicio, anioFin y mesFin válidos" });
      }
      const result = await reportesService.getInventarioAlmacen(parsed.data);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) res.status(error.statusCode).json({ error: error.message });
      else res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  async getEntradasAlmacen(req: Request, res: Response) {
    try {
      const parsed = periodoRangoQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Se requieren parámetros anioInicio, mesInicio, anioFin y mesFin válidos" });
      }
      const result = await reportesService.getEntradasAlmacen(parsed.data);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) res.status(error.statusCode).json({ error: error.message });
      else res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  async getSalidasAlmacen(req: Request, res: Response) {
    try {
      const parsed = periodoRangoQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Se requieren parámetros anioInicio, mesInicio, anioFin y mesFin válidos" });
      }
      const result = await reportesService.getSalidasAlmacen(parsed.data);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) res.status(error.statusCode).json({ error: error.message });
      else res.status(500).json({ error: "Error interno del servidor" });
    }
  },
};
