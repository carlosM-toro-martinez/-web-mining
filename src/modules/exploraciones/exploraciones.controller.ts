import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { exploracionesService } from "./exploraciones.service.js";

export const exploracionesController = {
  async crearMuestra(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const muestra = await exploracionesService.createMuestra(req.body, userId);
      res.status(201).json({ success: true, data: muestra });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async listarMuestras(req: AuthRequest, res: Response) {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);

      const result = await exploracionesService.getMuestras(page, limit);
      res.json({ success: true, data: result.muestras, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async obtenerMuestraPorId(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        return res.status(400).json({ success: false, error: "ID de muestra requerido" });
      }

      const muestra = await exploracionesService.getMuestraById(id);
      res.json({ success: true, data: muestra });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async actualizarMuestra(req: AuthRequest, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user?.id;

      if (!id) {
        return res.status(400).json({ success: false, error: "ID de muestra requerido" });
      }

      const muestra = await exploracionesService.updateMuestra(id, req.body, userId);
      res.json({ success: true, data: muestra });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async listarLaboratorios(req: AuthRequest, res: Response) {
    try {
      const laboratorios = await exploracionesService.getLaboratorios();
      res.json({ success: true, data: laboratorios });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async crearElemento(req: AuthRequest, res: Response) {
    try {
      const elemento = await exploracionesService.createElemento(req.body);
      res.status(201).json({ success: true, data: elemento });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 400;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async listarElementos(req: AuthRequest, res: Response) {
    try {
      const elementos = await exploracionesService.getElementos();
      res.json({ success: true, data: elementos });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async listarUbicaciones(req: AuthRequest, res: Response) {
    try {
      const ubicaciones = await exploracionesService.getAllUbicaciones();
      res.json({ success: true, data: ubicaciones });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async listarTodasMuestras(req: AuthRequest, res: Response) {
    try {
      const muestras = await exploracionesService.getAllMuestras();
      res.json({ success: true, data: muestras });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async listarResultados(req: AuthRequest, res: Response) {
    try {
      const resultados = await exploracionesService.getAllResultados();
      res.json({ success: true, data: resultados });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
