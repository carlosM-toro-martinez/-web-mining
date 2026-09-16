import type { Response } from "express";
import { formulario101Service } from "./formulario101.service.js";
import { formulario101QuerySchema } from "./formulario101.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const formulario101Controller = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = formulario101QuerySchema.parse(req.query);
      const data = await formulario101Service.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const formulario101 = await formulario101Service.getById(req.params.id as string);
      if (!formulario101) {
        return res.status(404).json({ success: false, error: "Formulario 101 no encontrado" });
      }
      res.json({ success: true, data: formulario101 });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async vincular(req: AuthRequest, res: Response) {
    try {
      const formulario101 = await formulario101Service.vincular(req.params.loteId as string, req.body, req.user!.id);
      res.status(201).json({ success: true, data: formulario101 });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async reutilizar(req: AuthRequest, res: Response) {
    try {
      const formulario101 = await formulario101Service.reutilizar(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: formulario101 });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async anular(req: AuthRequest, res: Response) {
    try {
      const formulario101 = await formulario101Service.anular(req.params.id as string, req.body, req.user!.id);
      res.json({ success: true, data: formulario101 });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async marcarPeticionEnviada(req: AuthRequest, res: Response) {
    try {
      const anulacion = await formulario101Service.marcarPeticionEnviada(req.params.id as string, req.user!.id);
      res.json({ success: true, data: anulacion });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
