import type { z } from "zod";
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

export type ProjectQuery = z.infer<typeof projectQuerySchema>;
export type CreateProjectDTO = z.infer<typeof createProjectSchema>;
export type UpdateProjectDTO = z.infer<typeof updateProjectSchema>;

export type ZoneQuery = z.infer<typeof zoneQuerySchema>;
export type CreateZoneDTO = z.infer<typeof createZoneSchema>;
export type UpdateZoneDTO = z.infer<typeof updateZoneSchema>;

export type DrillHoleQuery = z.infer<typeof drillHoleQuerySchema>;
export type CreateDrillHoleDTO = z.infer<typeof createDrillHoleSchema>;
export type UpdateDrillHoleDTO = z.infer<typeof updateDrillHoleSchema>;

export type IntervalQuery = z.infer<typeof intervalQuerySchema>;
export type CreateIntervalDTO = z.infer<typeof createIntervalSchema>;
export type UpdateIntervalDTO = z.infer<typeof updateIntervalSchema>;

export type AssayQuery = z.infer<typeof assayQuerySchema>;
export type CreateAssayDTO = z.infer<typeof createAssaySchema>;
export type UpdateAssayDTO = z.infer<typeof updateAssaySchema>;

export type LithologyQuery = z.infer<typeof lithologyQuerySchema>;
export type CreateLithologyDTO = z.infer<typeof createLithologySchema>;
export type UpdateLithologyDTO = z.infer<typeof updateLithologySchema>;

export type QAQCQuery = z.infer<typeof qaqcQuerySchema>;
export type CreateQAQCDTO = z.infer<typeof createQAQCSchema>;
export type UpdateQAQCDTO = z.infer<typeof updateQAQCSchema>;

export type ResourceQuery = z.infer<typeof resourceQuerySchema>;
export type CreateResourceDTO = z.infer<typeof createResourceSchema>;
export type UpdateResourceDTO = z.infer<typeof updateResourceSchema>;

export type DrillHoleSurveyQuery = z.infer<typeof drillHoleSurveyQuerySchema>;
export type CreateDrillHoleSurveyDTO = z.infer<typeof createDrillHoleSurveySchema>;
export type UpdateDrillHoleSurveyDTO = z.infer<typeof updateDrillHoleSurveySchema>;

export type AssayValueQuery = z.infer<typeof assayValueQuerySchema>;
export type CreateAssayValueDTO = z.infer<typeof createAssayValueSchema>;
export type UpdateAssayValueDTO = z.infer<typeof updateAssayValueSchema>;

export type AlterationQuery = z.infer<typeof alterationQuerySchema>;
export type CreateAlterationDTO = z.infer<typeof createAlterationSchema>;
export type UpdateAlterationDTO = z.infer<typeof updateAlterationSchema>;

export type MineralizationQuery = z.infer<typeof mineralizationQuerySchema>;
export type CreateMineralizationDTO = z.infer<typeof createMineralizationSchema>;
export type UpdateMineralizationDTO = z.infer<typeof updateMineralizationSchema>;

export type GeologicalStructureQuery = z.infer<typeof geologicalStructureQuerySchema>;
export type CreateGeologicalStructureDTO = z.infer<typeof createGeologicalStructureSchema>;
export type UpdateGeologicalStructureDTO = z.infer<typeof updateGeologicalStructureSchema>;

export type RecoveryQuery = z.infer<typeof recoveryQuerySchema>;
export type CreateRecoveryDTO = z.infer<typeof createRecoverySchema>;
export type UpdateRecoveryDTO = z.infer<typeof updateRecoverySchema>;

export type DensityQuery = z.infer<typeof densityQuerySchema>;
export type CreateDensityDTO = z.infer<typeof createDensitySchema>;
export type UpdateDensityDTO = z.infer<typeof updateDensitySchema>;

export type MagneticSusceptibilityQuery = z.infer<typeof magneticSusceptibilityQuerySchema>;
export type CreateMagneticSusceptibilityDTO = z.infer<typeof createMagneticSusceptibilitySchema>;
export type UpdateMagneticSusceptibilityDTO = z.infer<typeof updateMagneticSusceptibilitySchema>;

export type SignificantInterceptQuery = z.infer<typeof significantInterceptQuerySchema>;
export type CreateSignificantInterceptDTO = z.infer<typeof createSignificantInterceptSchema>;
export type UpdateSignificantInterceptDTO = z.infer<typeof updateSignificantInterceptSchema>;
