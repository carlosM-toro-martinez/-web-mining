import { Router } from "express";
import { surfaceExplorationController } from "./surfaceExploration.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  createElementSchema,
  createLaboratorySchema,
  createMiningAreaSchema,
  createMiningLaborSchema,
  createMiningLevelSchema,
  createSampleLabWithLaboratorySchema,
  createSampleLaboratorySchema,
  createSampleQAQCSchema,
  createSampleResultSchema,
  createSampleSchema,
  createSampleWithResultsSchema,
  elementQuerySchema,
  idSchema,
  laboratoryQuerySchema,
  miningAreaQuerySchema,
  miningLaborQuerySchema,
  miningLevelQuerySchema,
  sampleLaboratoryQuerySchema,
  sampleQAQCQuerySchema,
  sampleResultQuerySchema,
  sampleQuerySchema,
  updateElementSchema,
  updateLaboratorySchema,
  updateMiningAreaSchema,
  updateMiningLaborSchema,
  updateMiningLevelSchema,
  updateSampleLaboratorySchema,
  updateSampleQAQCSchema,
  updateSampleResultSchema,
  updateSampleSchema,
} from "./surfaceExploration.schema.js";

const validateQuery = (schema: any) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res
      .status(400)
      .json({ success: false, error: "Query validation error", details: result.error.flatten() });
  }
  req.validatedQuery = result.data;
  next();
};

const validateParams = (schema: any) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return res
      .status(400)
      .json({ success: false, error: "Params validation error", details: result.error.flatten() });
  }
  req.validatedParams = result.data;
  next();
};

const router = Router();
router.use(authenticate);

// ─── MiningArea ───────────────────────────────────────────────────────────────
router.get("/mining-areas", validateQuery(miningAreaQuerySchema), surfaceExplorationController.getMiningAreas);
router.get("/mining-areas/:id", validateParams(idSchema), surfaceExplorationController.getMiningAreaById);
router.post("/mining-areas", validate(createMiningAreaSchema), surfaceExplorationController.createMiningArea);
router.patch("/mining-areas/:id", validateParams(idSchema), validate(updateMiningAreaSchema), surfaceExplorationController.updateMiningArea);
router.delete("/mining-areas/:id", validateParams(idSchema), surfaceExplorationController.deleteMiningArea);

// ─── MiningLevel ─────────────────────────────────────────────────────────────
router.get("/mining-levels", validateQuery(miningLevelQuerySchema), surfaceExplorationController.getMiningLevels);
router.get("/mining-levels/:id", validateParams(idSchema), surfaceExplorationController.getMiningLevelById);
router.post("/mining-levels", validate(createMiningLevelSchema), surfaceExplorationController.createMiningLevel);
router.patch("/mining-levels/:id", validateParams(idSchema), validate(updateMiningLevelSchema), surfaceExplorationController.updateMiningLevel);
router.delete("/mining-levels/:id", validateParams(idSchema), surfaceExplorationController.deleteMiningLevel);

// ─── MiningLabor ─────────────────────────────────────────────────────────────
router.get("/mining-labors", validateQuery(miningLaborQuerySchema), surfaceExplorationController.getMiningLabors);
router.get("/mining-labors/:id", validateParams(idSchema), surfaceExplorationController.getMiningLaborById);
router.post("/mining-labors", validate(createMiningLaborSchema), surfaceExplorationController.createMiningLabor);
router.patch("/mining-labors/:id", validateParams(idSchema), validate(updateMiningLaborSchema), surfaceExplorationController.updateMiningLabor);
router.delete("/mining-labors/:id", validateParams(idSchema), surfaceExplorationController.deleteMiningLabor);

// ─── Sample ───────────────────────────────────────────────────────────────────
router.get("/samples/with-results", validateQuery(sampleQuerySchema), surfaceExplorationController.getSamplesWithResults);
router.post("/samples/with-results", validate(createSampleWithResultsSchema), surfaceExplorationController.createSampleWithResults);
router.get("/samples", validateQuery(sampleQuerySchema), surfaceExplorationController.getSamples);
router.get("/samples/:id", validateParams(idSchema), surfaceExplorationController.getSampleById);
router.post("/samples", validate(createSampleSchema), surfaceExplorationController.createSample);
router.patch("/samples/:id", validateParams(idSchema), validate(updateSampleSchema), surfaceExplorationController.updateSample);
router.delete("/samples/:id", validateParams(idSchema), surfaceExplorationController.deleteSample);

// ─── Laboratory ───────────────────────────────────────────────────────────────
router.get("/laboratories", validateQuery(laboratoryQuerySchema), surfaceExplorationController.getLaboratories);
router.get("/laboratories/:id", validateParams(idSchema), surfaceExplorationController.getLaboratoryById);
router.post("/laboratories", validate(createLaboratorySchema), surfaceExplorationController.createLaboratory);
router.patch("/laboratories/:id", validateParams(idSchema), validate(updateLaboratorySchema), surfaceExplorationController.updateLaboratory);
router.delete("/laboratories/:id", validateParams(idSchema), surfaceExplorationController.deleteLaboratory);

// ─── SampleLaboratory ─────────────────────────────────────────────────────────
router.get("/sample-laboratories/with-laboratory", validateQuery(sampleLaboratoryQuerySchema), surfaceExplorationController.getSampleLabsWithLaboratory);
router.post("/sample-laboratories/with-laboratory", validate(createSampleLabWithLaboratorySchema), surfaceExplorationController.createSampleLabWithLaboratory);
router.get("/sample-laboratories", validateQuery(sampleLaboratoryQuerySchema), surfaceExplorationController.getSampleLaboratories);
router.get("/sample-laboratories/:id", validateParams(idSchema), surfaceExplorationController.getSampleLaboratoryById);
router.post("/sample-laboratories", validate(createSampleLaboratorySchema), surfaceExplorationController.createSampleLaboratory);
router.patch("/sample-laboratories/:id", validateParams(idSchema), validate(updateSampleLaboratorySchema), surfaceExplorationController.updateSampleLaboratory);
router.delete("/sample-laboratories/:id", validateParams(idSchema), surfaceExplorationController.deleteSampleLaboratory);

// ─── Element ──────────────────────────────────────────────────────────────────
router.get("/elements", validateQuery(elementQuerySchema), surfaceExplorationController.getElements);
router.get("/elements/:id", validateParams(idSchema), surfaceExplorationController.getElementById);
router.post("/elements", validate(createElementSchema), surfaceExplorationController.createElement);
router.patch("/elements/:id", validateParams(idSchema), validate(updateElementSchema), surfaceExplorationController.updateElement);
router.delete("/elements/:id", validateParams(idSchema), surfaceExplorationController.deleteElement);

// ─── SampleResult ─────────────────────────────────────────────────────────────
router.get("/sample-results", validateQuery(sampleResultQuerySchema), surfaceExplorationController.getSampleResults);
router.get("/sample-results/:id", validateParams(idSchema), surfaceExplorationController.getSampleResultById);
router.post("/sample-results", validate(createSampleResultSchema), surfaceExplorationController.createSampleResult);
router.patch("/sample-results/:id", validateParams(idSchema), validate(updateSampleResultSchema), surfaceExplorationController.updateSampleResult);
router.delete("/sample-results/:id", validateParams(idSchema), surfaceExplorationController.deleteSampleResult);

// ─── SampleQAQC ───────────────────────────────────────────────────────────────
router.get("/sample-qaqc", validateQuery(sampleQAQCQuerySchema), surfaceExplorationController.getSampleQAQCs);
router.get("/sample-qaqc/:id", validateParams(idSchema), surfaceExplorationController.getSampleQAQCById);
router.post("/sample-qaqc", validate(createSampleQAQCSchema), surfaceExplorationController.createSampleQAQC);
router.patch("/sample-qaqc/:id", validateParams(idSchema), validate(updateSampleQAQCSchema), surfaceExplorationController.updateSampleQAQC);
router.delete("/sample-qaqc/:id", validateParams(idSchema), surfaceExplorationController.deleteSampleQAQC);

export default router;
