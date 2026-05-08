import type { Response } from "express";
import { miningExplorationService } from "./miningExploration.service.js";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";

const getUserId = (req: AuthRequest) => req.user?.id ?? 0;
const getValidatedQuery = (req: AuthRequest) => (req as any).validatedQuery ?? req.query;
const getValidatedParams = (req: AuthRequest) => (req as any).validatedParams ?? req.params;

export const miningExplorationController = {
  async getProjects(req: AuthRequest, res: Response) {
    try {
      const result = await miningExplorationService.getProjects(getValidatedQuery(req) as any);
      res.json({ success: true, data: result.projects, meta: result.meta });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getProjectById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const project = await miningExplorationService.getProjectById(id);
      if (!project) {
        return res.status(404).json({ success: false, error: "Proyecto no encontrado" });
      }
      res.json({ success: true, data: project });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createProject(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const project = await miningExplorationService.createProject(req.body as any, userId);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateProject(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const id = Number(getValidatedParams(req).id);
      const project = await miningExplorationService.updateProject(id, req.body as any, userId);
      res.json({ success: true, data: project });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getZones(req: AuthRequest, res: Response) {
    try {
      const zones = await miningExplorationService.getZones(getValidatedQuery(req) as any);
      res.json({ success: true, data: zones });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getZoneById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const zone = await miningExplorationService.getZoneById(id);
      if (!zone) {
        return res.status(404).json({ success: false, error: "Zona no encontrada" });
      }
      res.json({ success: true, data: zone });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createZone(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const zone = await miningExplorationService.createZone(req.body as any, userId);
      res.status(201).json({ success: true, data: zone });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateZone(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const id = Number(getValidatedParams(req).id);
      const zone = await miningExplorationService.updateZone(id, req.body as any, userId);
      res.json({ success: true, data: zone });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getDrillHoles(req: AuthRequest, res: Response) {
    try {
      const drillHoles = await miningExplorationService.getDrillHoles(
        getValidatedQuery(req) as any,
      );
      res.json({ success: true, data: drillHoles });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getDrillHoleById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const drillHole = await miningExplorationService.getDrillHoleById(id);
      if (!drillHole) {
        return res.status(404).json({ success: false, error: "Drill hole no encontrado" });
      }
      res.json({ success: true, data: drillHole });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createDrillHole(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const drillHole = await miningExplorationService.createDrillHole(req.body as any, userId);
      res.status(201).json({ success: true, data: drillHole });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateDrillHole(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const id = Number(getValidatedParams(req).id);
      const drillHole = await miningExplorationService.updateDrillHole(id, req.body as any, userId);
      res.json({ success: true, data: drillHole });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getIntervals(req: AuthRequest, res: Response) {
    try {
      const intervals = await miningExplorationService.getIntervals(getValidatedQuery(req) as any);
      res.json({ success: true, data: intervals });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getIntervalById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const interval = await miningExplorationService.getIntervalById(id);
      if (!interval) {
        return res.status(404).json({ success: false, error: "Intervalo no encontrado" });
      }
      res.json({ success: true, data: interval });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createInterval(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const interval = await miningExplorationService.createInterval(req.body as any, userId);
      res.status(201).json({ success: true, data: interval });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateInterval(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const id = Number(getValidatedParams(req).id);
      const interval = await miningExplorationService.updateInterval(id, req.body as any, userId);
      res.json({ success: true, data: interval });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getAssays(req: AuthRequest, res: Response) {
    try {
      const assays = await miningExplorationService.getAssays(getValidatedQuery(req) as any);
      res.json({ success: true, data: assays });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getAssayById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const assay = await miningExplorationService.getAssayById(id);
      if (!assay) {
        return res.status(404).json({ success: false, error: "Assay no encontrado" });
      }
      res.json({ success: true, data: assay });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createAssay(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const assay = await miningExplorationService.createAssay(req.body as any, userId);
      res.status(201).json({ success: true, data: assay });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateAssay(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const id = Number(getValidatedParams(req).id);
      const assay = await miningExplorationService.updateAssay(id, req.body as any, userId);
      res.json({ success: true, data: assay });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getLithologies(req: AuthRequest, res: Response) {
    try {
      const lithologies = await miningExplorationService.getLithologies(
        getValidatedQuery(req) as any,
      );
      res.json({ success: true, data: lithologies });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getLithologyById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const lithology = await miningExplorationService.getLithologyById(id);
      if (!lithology) {
        return res.status(404).json({ success: false, error: "Lithology no encontrado" });
      }
      res.json({ success: true, data: lithology });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createLithology(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const lithology = await miningExplorationService.createLithology(req.body as any, userId);
      res.status(201).json({ success: true, data: lithology });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateLithology(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const id = Number(getValidatedParams(req).id);
      const lithology = await miningExplorationService.updateLithology(id, req.body as any, userId);
      res.json({ success: true, data: lithology });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getQAQCs(req: AuthRequest, res: Response) {
    try {
      const qaqc = await miningExplorationService.getQAQCs(getValidatedQuery(req) as any);
      res.json({ success: true, data: qaqc });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getQAQCById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const qaqc = await miningExplorationService.getQAQCById(id);
      if (!qaqc) {
        return res.status(404).json({ success: false, error: "QAQC no encontrado" });
      }
      res.json({ success: true, data: qaqc });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createQAQC(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const qaqc = await miningExplorationService.createQAQC(req.body as any, userId);
      res.status(201).json({ success: true, data: qaqc });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateQAQC(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const id = Number(getValidatedParams(req).id);
      const qaqc = await miningExplorationService.updateQAQC(id, req.body as any, userId);
      res.json({ success: true, data: qaqc });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getResources(req: AuthRequest, res: Response) {
    try {
      const resources = await miningExplorationService.getResources(getValidatedQuery(req) as any);
      res.json({ success: true, data: resources });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getResourceById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const resource = await miningExplorationService.getResourceById(id);
      if (!resource) {
        return res.status(404).json({ success: false, error: "Resource no encontrado" });
      }
      res.json({ success: true, data: resource });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createResource(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const resource = await miningExplorationService.createResource(req.body as any, userId);
      res.status(201).json({ success: true, data: resource });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateResource(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      }
      const id = Number(getValidatedParams(req).id);
      const resource = await miningExplorationService.updateResource(id, req.body as any, userId);
      res.json({ success: true, data: resource });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
