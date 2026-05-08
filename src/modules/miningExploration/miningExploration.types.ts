import type { z } from "zod";
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

export type ProjectQuery = z.infer<typeof projectQuerySchema>;
export type ZoneQuery = z.infer<typeof zoneQuerySchema>;
export type DrillHoleQuery = z.infer<typeof drillHoleQuerySchema>;
export type IntervalQuery = z.infer<typeof intervalQuerySchema>;
export type AssayQuery = z.infer<typeof assayQuerySchema>;
export type LithologyQuery = z.infer<typeof lithologyQuerySchema>;
export type QAQCQuery = z.infer<typeof qaqcQuerySchema>;
export type ResourceQuery = z.infer<typeof resourceQuerySchema>;

export type CreateProjectDTO = z.infer<typeof createProjectSchema>;
export type UpdateProjectDTO = z.infer<typeof updateProjectSchema>;
export type CreateZoneDTO = z.infer<typeof createZoneSchema>;
export type UpdateZoneDTO = z.infer<typeof updateZoneSchema>;
export type CreateDrillHoleDTO = z.infer<typeof createDrillHoleSchema>;
export type UpdateDrillHoleDTO = z.infer<typeof updateDrillHoleSchema>;
export type CreateIntervalDTO = z.infer<typeof createIntervalSchema>;
export type UpdateIntervalDTO = z.infer<typeof updateIntervalSchema>;
export type CreateAssayDTO = z.infer<typeof createAssaySchema>;
export type UpdateAssayDTO = z.infer<typeof updateAssaySchema>;
export type CreateLithologyDTO = z.infer<typeof createLithologySchema>;
export type UpdateLithologyDTO = z.infer<typeof updateLithologySchema>;
export type CreateQAQCDTO = z.infer<typeof createQAQCSchema>;
export type UpdateQAQCDTO = z.infer<typeof updateQAQCSchema>;
export type CreateResourceDTO = z.infer<typeof createResourceSchema>;
export type UpdateResourceDTO = z.infer<typeof updateResourceSchema>;
