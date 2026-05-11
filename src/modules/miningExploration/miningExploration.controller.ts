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

  async deleteProject(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteProject(id);
      res.json({ success: true });
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

  async deleteZone(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteZone(id);
      res.json({ success: true });
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

  async deleteDrillHole(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteDrillHole(id);
      res.json({ success: true });
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

  async deleteInterval(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteInterval(id);
      res.json({ success: true });
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

  async deleteAssay(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteAssay(id);
      res.json({ success: true });
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

  async deleteLithology(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteLithology(id);
      res.json({ success: true });
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

  async deleteQAQC(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteQAQC(id);
      res.json({ success: true });
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

  async deleteResource(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteResource(id);
      res.json({ success: true });
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

  // ─── DrillHoleSurvey ───────────────────────────────────────────────────────
  async getDrillHoleSurveys(req: AuthRequest, res: Response) {
    try {
      const surveys = await miningExplorationService.getDrillHoleSurveys(getValidatedQuery(req) as any);
      res.json({ success: true, data: surveys });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getDrillHoleSurveyById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const survey = await miningExplorationService.getDrillHoleSurveyById(id);
      if (!survey) return res.status(404).json({ success: false, error: "DrillHoleSurvey no encontrado" });
      res.json({ success: true, data: survey });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createDrillHoleSurvey(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const survey = await miningExplorationService.createDrillHoleSurvey(req.body as any, userId);
      res.status(201).json({ success: true, data: survey });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateDrillHoleSurvey(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const id = Number(getValidatedParams(req).id);
      const survey = await miningExplorationService.updateDrillHoleSurvey(id, req.body as any, userId);
      res.json({ success: true, data: survey });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteDrillHoleSurvey(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteDrillHoleSurvey(id);
      res.json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── AssayValue ────────────────────────────────────────────────────────────
  async getAssayValues(req: AuthRequest, res: Response) {
    try {
      const values = await miningExplorationService.getAssayValues(getValidatedQuery(req) as any);
      res.json({ success: true, data: values });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getAssayValueById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const value = await miningExplorationService.getAssayValueById(id);
      if (!value) return res.status(404).json({ success: false, error: "AssayValue no encontrado" });
      res.json({ success: true, data: value });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createAssayValue(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const value = await miningExplorationService.createAssayValue(req.body as any, userId);
      res.status(201).json({ success: true, data: value });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateAssayValue(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const id = Number(getValidatedParams(req).id);
      const value = await miningExplorationService.updateAssayValue(id, req.body as any, userId);
      res.json({ success: true, data: value });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteAssayValue(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteAssayValue(id);
      res.json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Alteration ────────────────────────────────────────────────────────────
  async getAlterations(req: AuthRequest, res: Response) {
    try {
      const alterations = await miningExplorationService.getAlterations(getValidatedQuery(req) as any);
      res.json({ success: true, data: alterations });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getAlterationById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const alteration = await miningExplorationService.getAlterationById(id);
      if (!alteration) return res.status(404).json({ success: false, error: "Alteration no encontrada" });
      res.json({ success: true, data: alteration });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createAlteration(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const alteration = await miningExplorationService.createAlteration(req.body as any, userId);
      res.status(201).json({ success: true, data: alteration });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateAlteration(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const id = Number(getValidatedParams(req).id);
      const alteration = await miningExplorationService.updateAlteration(id, req.body as any, userId);
      res.json({ success: true, data: alteration });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteAlteration(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteAlteration(id);
      res.json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Mineralization ────────────────────────────────────────────────────────
  async getMineralizations(req: AuthRequest, res: Response) {
    try {
      const mineralizations = await miningExplorationService.getMineralizations(getValidatedQuery(req) as any);
      res.json({ success: true, data: mineralizations });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getMineralizationById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const mineralization = await miningExplorationService.getMineralizationById(id);
      if (!mineralization) return res.status(404).json({ success: false, error: "Mineralization no encontrada" });
      res.json({ success: true, data: mineralization });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createMineralization(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const mineralization = await miningExplorationService.createMineralization(req.body as any, userId);
      res.status(201).json({ success: true, data: mineralization });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateMineralization(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const id = Number(getValidatedParams(req).id);
      const mineralization = await miningExplorationService.updateMineralization(id, req.body as any, userId);
      res.json({ success: true, data: mineralization });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteMineralization(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteMineralization(id);
      res.json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── GeologicalStructure ───────────────────────────────────────────────────
  async getGeologicalStructures(req: AuthRequest, res: Response) {
    try {
      const structures = await miningExplorationService.getGeologicalStructures(getValidatedQuery(req) as any);
      res.json({ success: true, data: structures });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getGeologicalStructureById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const structure = await miningExplorationService.getGeologicalStructureById(id);
      if (!structure) return res.status(404).json({ success: false, error: "GeologicalStructure no encontrada" });
      res.json({ success: true, data: structure });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createGeologicalStructure(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const structure = await miningExplorationService.createGeologicalStructure(req.body as any, userId);
      res.status(201).json({ success: true, data: structure });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateGeologicalStructure(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const id = Number(getValidatedParams(req).id);
      const structure = await miningExplorationService.updateGeologicalStructure(id, req.body as any, userId);
      res.json({ success: true, data: structure });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteGeologicalStructure(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteGeologicalStructure(id);
      res.json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Recovery ──────────────────────────────────────────────────────────────
  async getRecoveries(req: AuthRequest, res: Response) {
    try {
      const recoveries = await miningExplorationService.getRecoveries(getValidatedQuery(req) as any);
      res.json({ success: true, data: recoveries });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getRecoveryById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const recovery = await miningExplorationService.getRecoveryById(id);
      if (!recovery) return res.status(404).json({ success: false, error: "Recovery no encontrado" });
      res.json({ success: true, data: recovery });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createRecovery(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const recovery = await miningExplorationService.createRecovery(req.body as any, userId);
      res.status(201).json({ success: true, data: recovery });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateRecovery(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const id = Number(getValidatedParams(req).id);
      const recovery = await miningExplorationService.updateRecovery(id, req.body as any, userId);
      res.json({ success: true, data: recovery });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteRecovery(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteRecovery(id);
      res.json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── Density ───────────────────────────────────────────────────────────────
  async getDensities(req: AuthRequest, res: Response) {
    try {
      const densities = await miningExplorationService.getDensities(getValidatedQuery(req) as any);
      res.json({ success: true, data: densities });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getDensityById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const density = await miningExplorationService.getDensityById(id);
      if (!density) return res.status(404).json({ success: false, error: "Density no encontrada" });
      res.json({ success: true, data: density });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createDensity(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const density = await miningExplorationService.createDensity(req.body as any, userId);
      res.status(201).json({ success: true, data: density });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateDensity(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const id = Number(getValidatedParams(req).id);
      const density = await miningExplorationService.updateDensity(id, req.body as any, userId);
      res.json({ success: true, data: density });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteDensity(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteDensity(id);
      res.json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── MagneticSusceptibility ────────────────────────────────────────────────
  async getMagneticSusceptibilities(req: AuthRequest, res: Response) {
    try {
      const items = await miningExplorationService.getMagneticSusceptibilities(getValidatedQuery(req) as any);
      res.json({ success: true, data: items });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getMagneticSusceptibilityById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const item = await miningExplorationService.getMagneticSusceptibilityById(id);
      if (!item) return res.status(404).json({ success: false, error: "MagneticSusceptibility no encontrada" });
      res.json({ success: true, data: item });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createMagneticSusceptibility(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const item = await miningExplorationService.createMagneticSusceptibility(req.body as any, userId);
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateMagneticSusceptibility(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const id = Number(getValidatedParams(req).id);
      const item = await miningExplorationService.updateMagneticSusceptibility(id, req.body as any, userId);
      res.json({ success: true, data: item });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteMagneticSusceptibility(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteMagneticSusceptibility(id);
      res.json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  // ─── SignificantIntercept ──────────────────────────────────────────────────
  async getSignificantIntercepts(req: AuthRequest, res: Response) {
    try {
      const items = await miningExplorationService.getSignificantIntercepts(getValidatedQuery(req) as any);
      res.json({ success: true, data: items });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async getSignificantInterceptById(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      const item = await miningExplorationService.getSignificantInterceptById(id);
      if (!item) return res.status(404).json({ success: false, error: "Intersección significativa no encontrada" });
      res.json({ success: true, data: item });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async createSignificantIntercept(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const item = await miningExplorationService.createSignificantIntercept(req.body as any, userId);
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async updateSignificantIntercept(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });
      const id = Number(getValidatedParams(req).id);
      const item = await miningExplorationService.updateSignificantIntercept(id, req.body as any, userId);
      res.json({ success: true, data: item });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },

  async deleteSignificantIntercept(req: AuthRequest, res: Response) {
    try {
      const id = Number(getValidatedParams(req).id);
      await miningExplorationService.deleteSignificantIntercept(id);
      res.json({ success: true });
    } catch (error) {
      const status = error instanceof HttpError ? error.statusCode : 500;
      res.status(status).json({ success: false, error: (error as Error).message });
    }
  },
};
