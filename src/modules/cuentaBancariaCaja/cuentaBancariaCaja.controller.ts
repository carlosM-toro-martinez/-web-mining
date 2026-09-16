import type { Response } from "express";
import { cuentaBancariaCajaService } from "./cuentaBancariaCaja.service.js";
import { cuentaBancariaCajaQuerySchema } from "./cuentaBancariaCaja.schema.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

export const cuentaBancariaCajaController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      // Express 5: req.query es un getter de solo lectura, validateQuery()
      // no puede persistir la coerción de zod ahí, así que se vuelve a
      // parsear aquí (mismo patrón que gastoCaja.controller.ts).
      const query = cuentaBancariaCajaQuerySchema.parse(req.query);
      const data = await cuentaBancariaCajaService.getAll(query);
      res.json({ success: true, data });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const cuenta = await cuentaBancariaCajaService.getById(id);

      if (!cuenta) {
        return res.status(404).json({ success: false, error: "Cuenta bancaria no encontrada" });
      }

      res.json({ success: true, data: cuenta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const cuenta = await cuentaBancariaCajaService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: cuenta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const cuenta = await cuentaBancariaCajaService.update(id, req.body, req.user!.id);
      res.json({ success: true, data: cuenta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await cuentaBancariaCajaService.remove(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
