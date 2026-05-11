import { Router } from "express";
import { miningExplorationController } from "./miningExploration.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { z } from "zod";
import {
  alterationQuerySchema,
  assayQuerySchema,
  assayValueQuerySchema,
  createAlterationSchema,
  createAssaySchema,
  createAssayValueSchema,
  createDensitySchema,
  createDrillHoleSchema,
  createDrillHoleSurveySchema,
  createGeologicalStructureSchema,
  createIntervalSchema,
  createLithologySchema,
  createMagneticSusceptibilitySchema,
  createMineralizationSchema,
  createProjectSchema,
  createQAQCSchema,
  createRecoverySchema,
  createResourceSchema,
  createSignificantInterceptSchema,
  createZoneSchema,
  densityQuerySchema,
  drillHoleQuerySchema,
  drillHoleSurveyQuerySchema,
  geologicalStructureQuerySchema,
  intervalQuerySchema,
  lithologyQuerySchema,
  magneticSusceptibilityQuerySchema,
  mineralizationQuerySchema,
  projectQuerySchema,
  qaqcQuerySchema,
  recoveryQuerySchema,
  resourceQuerySchema,
  significantInterceptQuerySchema,
  updateAlterationSchema,
  updateAssaySchema,
  updateAssayValueSchema,
  updateDensitySchema,
  updateDrillHoleSchema,
  updateDrillHoleSurveySchema,
  updateGeologicalStructureSchema,
  updateIntervalSchema,
  updateLithologySchema,
  updateMagneticSusceptibilitySchema,
  updateMineralizationSchema,
  updateProjectSchema,
  updateQAQCSchema,
  updateRecoverySchema,
  updateResourceSchema,
  updateSignificantInterceptSchema,
  updateZoneSchema,
  zoneQuerySchema,
} from "./miningExploration.schema.js";

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

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

// ─── Project ──────────────────────────────────────────────────────────────────
router.get("/projects", validateQuery(projectQuerySchema), miningExplorationController.getProjects);
router.get("/projects/:id", validateParams(idSchema), miningExplorationController.getProjectById);
router.post("/projects", validate(createProjectSchema), miningExplorationController.createProject);
router.patch("/projects/:id", validateParams(idSchema), validate(updateProjectSchema), miningExplorationController.updateProject);
router.delete("/projects/:id", validateParams(idSchema), miningExplorationController.deleteProject);

// ─── Zone ─────────────────────────────────────────────────────────────────────
router.get("/zones", validateQuery(zoneQuerySchema), miningExplorationController.getZones);
router.get("/zones/:id", validateParams(idSchema), miningExplorationController.getZoneById);
router.post("/zones", validate(createZoneSchema), miningExplorationController.createZone);
router.patch("/zones/:id", validateParams(idSchema), validate(updateZoneSchema), miningExplorationController.updateZone);
router.delete("/zones/:id", validateParams(idSchema), miningExplorationController.deleteZone);

// ─── DrillHole ────────────────────────────────────────────────────────────────
router.get("/drillholes", validateQuery(drillHoleQuerySchema), miningExplorationController.getDrillHoles);
router.get("/drillholes/:id", validateParams(idSchema), miningExplorationController.getDrillHoleById);
router.post("/drillholes", validate(createDrillHoleSchema), miningExplorationController.createDrillHole);
router.patch("/drillholes/:id", validateParams(idSchema), validate(updateDrillHoleSchema), miningExplorationController.updateDrillHole);
router.delete("/drillholes/:id", validateParams(idSchema), miningExplorationController.deleteDrillHole);

// ─── Interval ─────────────────────────────────────────────────────────────────
router.get("/intervals", validateQuery(intervalQuerySchema), miningExplorationController.getIntervals);
router.get("/intervals/:id", validateParams(idSchema), miningExplorationController.getIntervalById);
router.post("/intervals", validate(createIntervalSchema), miningExplorationController.createInterval);
router.patch("/intervals/:id", validateParams(idSchema), validate(updateIntervalSchema), miningExplorationController.updateInterval);
router.delete("/intervals/:id", validateParams(idSchema), miningExplorationController.deleteInterval);

// ─── Assay ────────────────────────────────────────────────────────────────────
router.get("/assays", validateQuery(assayQuerySchema), miningExplorationController.getAssays);
router.get("/assays/:id", validateParams(idSchema), miningExplorationController.getAssayById);
router.post("/assays", validate(createAssaySchema), miningExplorationController.createAssay);
router.patch("/assays/:id", validateParams(idSchema), validate(updateAssaySchema), miningExplorationController.updateAssay);
router.delete("/assays/:id", validateParams(idSchema), miningExplorationController.deleteAssay);

// ─── Lithology ────────────────────────────────────────────────────────────────
router.get("/lithologies", validateQuery(lithologyQuerySchema), miningExplorationController.getLithologies);
router.get("/lithologies/:id", validateParams(idSchema), miningExplorationController.getLithologyById);
router.post("/lithologies", validate(createLithologySchema), miningExplorationController.createLithology);
router.patch("/lithologies/:id", validateParams(idSchema), validate(updateLithologySchema), miningExplorationController.updateLithology);
router.delete("/lithologies/:id", validateParams(idSchema), miningExplorationController.deleteLithology);

// ─── QAQC ─────────────────────────────────────────────────────────────────────
router.get("/qaqc", validateQuery(qaqcQuerySchema), miningExplorationController.getQAQCs);
router.get("/qaqc/:id", validateParams(idSchema), miningExplorationController.getQAQCById);
router.post("/qaqc", validate(createQAQCSchema), miningExplorationController.createQAQC);
router.patch("/qaqc/:id", validateParams(idSchema), validate(updateQAQCSchema), miningExplorationController.updateQAQC);
router.delete("/qaqc/:id", validateParams(idSchema), miningExplorationController.deleteQAQC);

// ─── Resource ─────────────────────────────────────────────────────────────────
router.get("/resources", validateQuery(resourceQuerySchema), miningExplorationController.getResources);
router.get("/resources/:id", validateParams(idSchema), miningExplorationController.getResourceById);
router.post("/resources", validate(createResourceSchema), miningExplorationController.createResource);
router.patch("/resources/:id", validateParams(idSchema), validate(updateResourceSchema), miningExplorationController.updateResource);
router.delete("/resources/:id", validateParams(idSchema), miningExplorationController.deleteResource);

// ─── DrillHoleSurvey ─────────────────────────────────────────────────────────
router.get("/drill-hole-surveys", validateQuery(drillHoleSurveyQuerySchema), miningExplorationController.getDrillHoleSurveys);
router.get("/drill-hole-surveys/:id", validateParams(idSchema), miningExplorationController.getDrillHoleSurveyById);
router.post("/drill-hole-surveys", validate(createDrillHoleSurveySchema), miningExplorationController.createDrillHoleSurvey);
router.put("/drill-hole-surveys/:id", validateParams(idSchema), validate(updateDrillHoleSurveySchema), miningExplorationController.updateDrillHoleSurvey);
router.delete("/drill-hole-surveys/:id", validateParams(idSchema), miningExplorationController.deleteDrillHoleSurvey);

// ─── AssayValue ───────────────────────────────────────────────────────────────
router.get("/assay-values", validateQuery(assayValueQuerySchema), miningExplorationController.getAssayValues);
router.get("/assay-values/:id", validateParams(idSchema), miningExplorationController.getAssayValueById);
router.post("/assay-values", validate(createAssayValueSchema), miningExplorationController.createAssayValue);
router.put("/assay-values/:id", validateParams(idSchema), validate(updateAssayValueSchema), miningExplorationController.updateAssayValue);
router.delete("/assay-values/:id", validateParams(idSchema), miningExplorationController.deleteAssayValue);

// ─── Alteration ───────────────────────────────────────────────────────────────
router.get("/alterations", validateQuery(alterationQuerySchema), miningExplorationController.getAlterations);
router.get("/alterations/:id", validateParams(idSchema), miningExplorationController.getAlterationById);
router.post("/alterations", validate(createAlterationSchema), miningExplorationController.createAlteration);
router.put("/alterations/:id", validateParams(idSchema), validate(updateAlterationSchema), miningExplorationController.updateAlteration);
router.delete("/alterations/:id", validateParams(idSchema), miningExplorationController.deleteAlteration);

// ─── Mineralization ───────────────────────────────────────────────────────────
router.get("/mineralizations", validateQuery(mineralizationQuerySchema), miningExplorationController.getMineralizations);
router.get("/mineralizations/:id", validateParams(idSchema), miningExplorationController.getMineralizationById);
router.post("/mineralizations", validate(createMineralizationSchema), miningExplorationController.createMineralization);
router.put("/mineralizations/:id", validateParams(idSchema), validate(updateMineralizationSchema), miningExplorationController.updateMineralization);
router.delete("/mineralizations/:id", validateParams(idSchema), miningExplorationController.deleteMineralization);

// ─── GeologicalStructure ──────────────────────────────────────────────────────
router.get("/geological-structures", validateQuery(geologicalStructureQuerySchema), miningExplorationController.getGeologicalStructures);
router.get("/geological-structures/:id", validateParams(idSchema), miningExplorationController.getGeologicalStructureById);
router.post("/geological-structures", validate(createGeologicalStructureSchema), miningExplorationController.createGeologicalStructure);
router.put("/geological-structures/:id", validateParams(idSchema), validate(updateGeologicalStructureSchema), miningExplorationController.updateGeologicalStructure);
router.delete("/geological-structures/:id", validateParams(idSchema), miningExplorationController.deleteGeologicalStructure);

// ─── Recovery ─────────────────────────────────────────────────────────────────
router.get("/recoveries", validateQuery(recoveryQuerySchema), miningExplorationController.getRecoveries);
router.get("/recoveries/:id", validateParams(idSchema), miningExplorationController.getRecoveryById);
router.post("/recoveries", validate(createRecoverySchema), miningExplorationController.createRecovery);
router.put("/recoveries/:id", validateParams(idSchema), validate(updateRecoverySchema), miningExplorationController.updateRecovery);
router.delete("/recoveries/:id", validateParams(idSchema), miningExplorationController.deleteRecovery);

// ─── Density ──────────────────────────────────────────────────────────────────
router.get("/densities", validateQuery(densityQuerySchema), miningExplorationController.getDensities);
router.get("/densities/:id", validateParams(idSchema), miningExplorationController.getDensityById);
router.post("/densities", validate(createDensitySchema), miningExplorationController.createDensity);
router.put("/densities/:id", validateParams(idSchema), validate(updateDensitySchema), miningExplorationController.updateDensity);
router.delete("/densities/:id", validateParams(idSchema), miningExplorationController.deleteDensity);

// ─── MagneticSusceptibility ───────────────────────────────────────────────────
router.get("/magnetic-susceptibilities", validateQuery(magneticSusceptibilityQuerySchema), miningExplorationController.getMagneticSusceptibilities);
router.get("/magnetic-susceptibilities/:id", validateParams(idSchema), miningExplorationController.getMagneticSusceptibilityById);
router.post("/magnetic-susceptibilities", validate(createMagneticSusceptibilitySchema), miningExplorationController.createMagneticSusceptibility);
router.put("/magnetic-susceptibilities/:id", validateParams(idSchema), validate(updateMagneticSusceptibilitySchema), miningExplorationController.updateMagneticSusceptibility);
router.delete("/magnetic-susceptibilities/:id", validateParams(idSchema), miningExplorationController.deleteMagneticSusceptibility);

// ─── SignificantIntercept ─────────────────────────────────────────────────────
router.get("/significant-intercepts", validateQuery(significantInterceptQuerySchema), miningExplorationController.getSignificantIntercepts);
router.get("/significant-intercepts/:id", validateParams(idSchema), miningExplorationController.getSignificantInterceptById);
router.post("/significant-intercepts", validate(createSignificantInterceptSchema), miningExplorationController.createSignificantIntercept);
router.put("/significant-intercepts/:id", validateParams(idSchema), validate(updateSignificantInterceptSchema), miningExplorationController.updateSignificantIntercept);
router.delete("/significant-intercepts/:id", validateParams(idSchema), miningExplorationController.deleteSignificantIntercept);

export default router;
