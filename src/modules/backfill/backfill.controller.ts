import type { Request, Response } from "express";
import { HttpError } from "../../errors/http.error.js";
import { backfillService } from "./backfill.service.js";

export const backfillController = {
  async backfillCPP(req: Request, res: Response) {
    try {
      const { anio, mes } = req.body as { anio: unknown; mes: unknown };

      const anioNum = Number(anio);
      const mesNum  = Number(mes);

      if (!Number.isInteger(anioNum) || !Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12 || anioNum < 2000) {
        return res.status(400).json({
          success: false,
          error: "Se requieren anio (entero ≥ 2000) y mes (entero 1–12)",
        });
      }

      const result = await backfillService.backfillCPP({ anio: anioNum, mes: mesNum });
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
      console.error("[backfill-cpp] Error:", error);
      res.status(500).json({ success: false, error: "Error en el proceso de backfill" });
    }
  },

  async syncStockFromSaldoMensual(_req: Request, res: Response) {
    try {
      const result = await backfillService.syncStockFromSaldoMensual();
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.statusCode).json({ success: false, error: error.message });
      console.error("[sync-stock] Error:", error);
      res.status(500).json({ success: false, error: "Error al sincronizar stock desde SaldoMensual" });
    }
  },
};
