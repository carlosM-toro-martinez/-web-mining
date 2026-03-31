import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { contabilidadService } from "./contabilidad.service.js";

function getErrorStatus(error: unknown, fallback: number) {
  return error instanceof HttpError ? error.statusCode : fallback;
}

export const contabilidadController = {
  async getCentrosCosto(_req: AuthRequest, res: Response) {
    try {
      const data = await contabilidadService.getCentrosCosto();
      res.json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 500))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async getCentroCostoById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const data = await contabilidadService.getCentroCostoById(id);
      if (!data) {
        return res.status(404).json({ success: false, error: "Centro de costo no encontrado" });
      }
      res.json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 500))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async createCentroCosto(req: AuthRequest, res: Response) {
    try {
      const data = await contabilidadService.createCentroCosto(req.body, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 400))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async updateCentroCosto(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const data = await contabilidadService.updateCentroCosto(id, req.body, req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 400))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async deleteCentroCosto(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await contabilidadService.deleteCentroCosto(id, req.user!.id);
      res.status(204).json({ success: true });
    } catch (error) {
      res
        .status(getErrorStatus(error, 400))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async getFuncionesGasto(_req: AuthRequest, res: Response) {
    try {
      const data = await contabilidadService.getFuncionesGasto();
      res.json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 500))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async getFuncionGastoById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const data = await contabilidadService.getFuncionGastoById(id);
      if (!data) {
        return res.status(404).json({ success: false, error: "Función de gasto no encontrada" });
      }
      res.json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 500))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async createFuncionGasto(req: AuthRequest, res: Response) {
    try {
      const data = await contabilidadService.createFuncionGasto(req.body, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 400))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async updateFuncionGasto(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const data = await contabilidadService.updateFuncionGasto(id, req.body, req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 400))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async deleteFuncionGasto(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await contabilidadService.deleteFuncionGasto(id, req.user!.id);
      res.status(204).json({ success: true });
    } catch (error) {
      res
        .status(getErrorStatus(error, 400))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async getCuentasContables(_req: AuthRequest, res: Response) {
    try {
      const data = await contabilidadService.getCuentasContables();
      res.json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 500))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async getCuentaContableById(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const data = await contabilidadService.getCuentaContableById(id);
      if (!data) {
        return res.status(404).json({ success: false, error: "Cuenta contable no encontrada" });
      }
      res.json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 500))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async createCuentaContable(req: AuthRequest, res: Response) {
    try {
      const data = await contabilidadService.createCuentaContable(req.body, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 400))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async updateCuentaContable(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const data = await contabilidadService.updateCuentaContable(id, req.body, req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      res
        .status(getErrorStatus(error, 400))
        .json({ success: false, error: (error as Error).message });
    }
  },

  async deleteCuentaContable(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await contabilidadService.deleteCuentaContable(id, req.user!.id);
      res.status(204).json({ success: true });
    } catch (error) {
      res
        .status(getErrorStatus(error, 400))
        .json({ success: false, error: (error as Error).message });
    }
  },
};

