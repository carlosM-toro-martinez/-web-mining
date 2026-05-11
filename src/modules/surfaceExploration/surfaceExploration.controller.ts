import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { HttpError } from "../../errors/http.error.js";
import { surfaceExplorationService } from "./surfaceExploration.service.js";

const uid = (req: AuthRequest) => req.user?.id;
const vq = (req: AuthRequest) => (req as any).validatedQuery;
const vp = (req: AuthRequest) => (req as any).validatedParams;

const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

const fail = (res: Response, error: unknown) => {
  const status = error instanceof HttpError ? error.statusCode : 500;
  res.status(status).json({ success: false, error: (error as Error).message });
};

export const surfaceExplorationController = {

  // ─── MiningArea ─────────────────────────────────────────────────────────────
  async getMiningAreas(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getMiningAreas(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getMiningAreaById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getMiningAreaById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createMiningArea(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createMiningArea(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateMiningArea(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.updateMiningArea(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteMiningArea(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.deleteMiningArea(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── MiningLevel ────────────────────────────────────────────────────────────
  async getMiningLevels(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getMiningLevels(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getMiningLevelById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getMiningLevelById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createMiningLevel(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createMiningLevel(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateMiningLevel(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.updateMiningLevel(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteMiningLevel(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.deleteMiningLevel(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── MiningLabor ────────────────────────────────────────────────────────────
  async getMiningLabors(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getMiningLabors(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getMiningLaborById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getMiningLaborById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createMiningLabor(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createMiningLabor(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateMiningLabor(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.updateMiningLabor(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteMiningLabor(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.deleteMiningLabor(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── Sample ─────────────────────────────────────────────────────────────────
  async getSamples(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getSamples(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getSampleById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getSampleById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createSample(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createSample(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSample(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.updateSample(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteSample(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.deleteSample(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── Laboratory ─────────────────────────────────────────────────────────────
  async getLaboratories(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getLaboratories(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getLaboratoryById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getLaboratoryById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createLaboratory(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.updateLaboratory(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.deleteLaboratory(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── SampleLaboratory ───────────────────────────────────────────────────────
  async getSampleLaboratories(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getSampleLaboratories(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getSampleLaboratoryById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getSampleLaboratoryById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createSampleLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createSampleLaboratory(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSampleLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.updateSampleLaboratory(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteSampleLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.deleteSampleLaboratory(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── Element ────────────────────────────────────────────────────────────────
  async getElements(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getElements(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getElementById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getElementById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createElement(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createElement(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateElement(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.updateElement(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteElement(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.deleteElement(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── SampleResult ───────────────────────────────────────────────────────────
  async getSampleResults(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getSampleResults(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getSampleResultById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getSampleResultById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createSampleResult(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createSampleResult(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSampleResult(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.updateSampleResult(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteSampleResult(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.deleteSampleResult(vp(req).id)); }
    catch (e) { fail(res, e); }
  },

  // ─── Sample with Results (transaction) ──────────────────────────────────────
  async getSamplesWithResults(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getSamplesWithResults(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async createSampleWithResults(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createSampleWithResults(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },

  // ─── SampleLaboratory with Laboratory (transaction) ──────────────────────────
  async getSampleLabsWithLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getSampleLabsWithLaboratory(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async createSampleLabWithLaboratory(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createSampleLabWithLaboratory(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },

  // ─── SampleQAQC ─────────────────────────────────────────────────────────────
  async getSampleQAQCs(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getSampleQAQCs(vq(req))); }
    catch (e) { fail(res, e); }
  },
  async getSampleQAQCById(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.getSampleQAQCById(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
  async createSampleQAQC(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.createSampleQAQC(req.body, uid(req)), 201); }
    catch (e) { fail(res, e); }
  },
  async updateSampleQAQC(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.updateSampleQAQC(vp(req).id, req.body, uid(req))); }
    catch (e) { fail(res, e); }
  },
  async deleteSampleQAQC(req: AuthRequest, res: Response) {
    try { ok(res, await surfaceExplorationService.deleteSampleQAQC(vp(req).id)); }
    catch (e) { fail(res, e); }
  },
};
