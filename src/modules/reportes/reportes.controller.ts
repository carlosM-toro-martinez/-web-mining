import type { Request, Response } from "express";
import { reportesService } from "./reportes.service.js";
import { binCardQuerySchema } from "./reportes.schema.js";
import { HttpError } from "../../errors/http.error.js";

export const reportesController = {
  async getBinCard(req: Request, res: Response) {
    try {
      const query = binCardQuerySchema.parse(req.query);
      const result = await reportesService.getBinCard(query);
      res.json(result);
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Error interno del servidor" });
      }
    }
  },

  async getBinCardValorado(req: Request, res: Response) {
    try {
      const query = binCardQuerySchema.parse(req.query);
      const result = await reportesService.getBinCardValorado(query);
      res.json(result);
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Error interno del servidor" });
      }
    }
  },
};
