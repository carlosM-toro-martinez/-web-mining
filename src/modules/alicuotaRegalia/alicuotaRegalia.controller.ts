import type { Response } from "express";
import { alicuotaRegaliaService } from "./alicuotaRegalia.service.js";
import { alicuotaRegaliaQuerySchema } from "./alicuotaRegalia.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const alicuotaRegaliaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = alicuotaRegaliaQuerySchema.parse(req.query);
      const data = await alicuotaRegaliaService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const alicuota = await alicuotaRegaliaService.getById(id);

      if (!alicuota) {
        return res.status(404).json({ success: false, error: "Alícuota de regalía no encontrada" });
      }

      res.json({ success: true, data: alicuota });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const alicuota = await alicuotaRegaliaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: alicuota });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
