import type { z } from "zod";
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
  laboratoryQuerySchema,
  miningAreaQuerySchema,
  miningLaborQuerySchema,
  miningLevelQuerySchema,
  sampleLaboratoryQuerySchema,
  sampleQAQCQuerySchema,
  sampleQuerySchema,
  sampleResultQuerySchema,
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

export type MiningAreaQuery = z.infer<typeof miningAreaQuerySchema>;
export type CreateMiningAreaDTO = z.infer<typeof createMiningAreaSchema>;
export type UpdateMiningAreaDTO = z.infer<typeof updateMiningAreaSchema>;

export type MiningLevelQuery = z.infer<typeof miningLevelQuerySchema>;
export type CreateMiningLevelDTO = z.infer<typeof createMiningLevelSchema>;
export type UpdateMiningLevelDTO = z.infer<typeof updateMiningLevelSchema>;

export type MiningLaborQuery = z.infer<typeof miningLaborQuerySchema>;
export type CreateMiningLaborDTO = z.infer<typeof createMiningLaborSchema>;
export type UpdateMiningLaborDTO = z.infer<typeof updateMiningLaborSchema>;

export type SampleQuery = z.infer<typeof sampleQuerySchema>;
export type CreateSampleDTO = z.infer<typeof createSampleSchema>;
export type UpdateSampleDTO = z.infer<typeof updateSampleSchema>;

export type LaboratoryQuery = z.infer<typeof laboratoryQuerySchema>;
export type CreateLaboratoryDTO = z.infer<typeof createLaboratorySchema>;
export type UpdateLaboratoryDTO = z.infer<typeof updateLaboratorySchema>;

export type SampleLaboratoryQuery = z.infer<typeof sampleLaboratoryQuerySchema>;
export type CreateSampleLaboratoryDTO = z.infer<typeof createSampleLaboratorySchema>;
export type UpdateSampleLaboratoryDTO = z.infer<typeof updateSampleLaboratorySchema>;

export type ElementQuery = z.infer<typeof elementQuerySchema>;
export type CreateElementDTO = z.infer<typeof createElementSchema>;
export type UpdateElementDTO = z.infer<typeof updateElementSchema>;

export type SampleResultQuery = z.infer<typeof sampleResultQuerySchema>;
export type CreateSampleResultDTO = z.infer<typeof createSampleResultSchema>;
export type UpdateSampleResultDTO = z.infer<typeof updateSampleResultSchema>;

export type SampleQAQCQuery = z.infer<typeof sampleQAQCQuerySchema>;
export type CreateSampleQAQCDTO = z.infer<typeof createSampleQAQCSchema>;
export type UpdateSampleQAQCDTO = z.infer<typeof updateSampleQAQCSchema>;

export type CreateSampleWithResultsDTO = z.infer<typeof createSampleWithResultsSchema>;
export type CreateSampleLabWithLaboratoryDTO = z.infer<typeof createSampleLabWithLaboratorySchema>;
