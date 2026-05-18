import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import {
  importarCatalogo,
  cargarStockInicial,
  cargarSaldoMensual,
  getSaldosMensualesCargados,
} from "./inventarioImport.service.js";
import {
  stockInicialSchema,
  saldoMensualSchema,
  saldoMensualQuerySchema,
} from "./inventarioImport.schema.js";

export const inventarioImportController = {
  async importarCatalogo(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "Se requiere un archivo Excel" });
      }
      const anio = req.query.anio ? parseInt(String(req.query.anio)) : undefined;
      const mes  = req.query.mes  ? parseInt(String(req.query.mes))  : undefined;
      const opciones = anio && mes ? { anio, mes } : undefined;
      const result = await importarCatalogo(req.file.buffer, opciones);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async cargarStockInicial(req: AuthRequest, res: Response) {
    try {
      const parsed = stockInicialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const result = await cargarStockInicial(parsed.data.items, req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async cargarSaldoMensual(req: AuthRequest, res: Response) {
    try {
      const parsed = saldoMensualSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Datos inválidos", details: parsed.error.flatten() });
      }
      const result = await cargarSaldoMensual(parsed.data, req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getSaldosMensuales(req: AuthRequest, res: Response) {
    try {
      const parsed = saldoMensualQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Parámetros inválidos. Se requieren anio y mes." });
      }
      const data = await getSaldosMensualesCargados(parsed.data.anio, parsed.data.mes);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
