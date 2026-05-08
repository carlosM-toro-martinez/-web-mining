import { Router } from "express";
import { miningExplorationController } from "./miningExploration.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { z } from "zod";
import {
  assayQuerySchema,
  createAssaySchema,
  createDrillHoleSchema,
  createIntervalSchema,
  createLithologySchema,
  createProjectSchema,
  createQAQCSchema,
  createResourceSchema,
  createZoneSchema,
  drillHoleQuerySchema,
  intervalQuerySchema,
  lithologyQuerySchema,
  projectQuerySchema,
  qaqcQuerySchema,
  resourceQuerySchema,
  updateAssaySchema,
  updateDrillHoleSchema,
  updateIntervalSchema,
  updateLithologySchema,
  updateProjectSchema,
  updateQAQCSchema,
  updateResourceSchema,
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

router.get("/projects", validateQuery(projectQuerySchema), miningExplorationController.getProjects);
router.get("/projects/:id", validateParams(idSchema), miningExplorationController.getProjectById);
router.post("/projects", validate(createProjectSchema), miningExplorationController.createProject);
router.patch(
  "/projects/:id",
  validate(updateProjectSchema),
  miningExplorationController.updateProject,
);

router.get("/zones", validateQuery(zoneQuerySchema), miningExplorationController.getZones);
router.get("/zones/:id", validateParams(idSchema), miningExplorationController.getZoneById);
router.post("/zones", validate(createZoneSchema), miningExplorationController.createZone);
router.patch("/zones/:id", validate(updateZoneSchema), miningExplorationController.updateZone);

router.get(
  "/drillholes",
  validateQuery(drillHoleQuerySchema),
  miningExplorationController.getDrillHoles,
);
router.get(
  "/drillholes/:id",
  validateParams(idSchema),
  miningExplorationController.getDrillHoleById,
);
router.post(
  "/drillholes",
  validate(createDrillHoleSchema),
  miningExplorationController.createDrillHole,
);
router.patch(
  "/drillholes/:id",
  validate(updateDrillHoleSchema),
  miningExplorationController.updateDrillHole,
);

router.get(
  "/intervals",
  validateQuery(intervalQuerySchema),
  miningExplorationController.getIntervals,
);
router.get("/intervals/:id", validateParams(idSchema), miningExplorationController.getIntervalById);
router.post(
  "/intervals",
  validate(createIntervalSchema),
  miningExplorationController.createInterval,
);
router.patch(
  "/intervals/:id",
  validate(updateIntervalSchema),
  miningExplorationController.updateInterval,
);

router.get("/assays", validateQuery(assayQuerySchema), miningExplorationController.getAssays);
router.get("/assays/:id", validateParams(idSchema), miningExplorationController.getAssayById);
router.post("/assays", validate(createAssaySchema), miningExplorationController.createAssay);
router.patch("/assays/:id", validate(updateAssaySchema), miningExplorationController.updateAssay);

router.get(
  "/lithologies",
  validateQuery(lithologyQuerySchema),
  miningExplorationController.getLithologies,
);
router.get(
  "/lithologies/:id",
  validateParams(idSchema),
  miningExplorationController.getLithologyById,
);
router.post(
  "/lithologies",
  validate(createLithologySchema),
  miningExplorationController.createLithology,
);
router.patch(
  "/lithologies/:id",
  validate(updateLithologySchema),
  miningExplorationController.updateLithology,
);

router.get("/qaqc", validateQuery(qaqcQuerySchema), miningExplorationController.getQAQCs);
router.get("/qaqc/:id", validateParams(idSchema), miningExplorationController.getQAQCById);
router.post("/qaqc", validate(createQAQCSchema), miningExplorationController.createQAQC);
router.patch("/qaqc/:id", validate(updateQAQCSchema), miningExplorationController.updateQAQC);

router.get(
  "/resources",
  validateQuery(resourceQuerySchema),
  miningExplorationController.getResources,
);
router.get("/resources/:id", validateParams(idSchema), miningExplorationController.getResourceById);
router.post(
  "/resources",
  validate(createResourceSchema),
  miningExplorationController.createResource,
);
router.patch(
  "/resources/:id",
  validate(updateResourceSchema),
  miningExplorationController.updateResource,
);

export default router;
