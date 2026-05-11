import { z } from "zod";

const pagination = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

// ─── MiningArea ───────────────────────────────────────────────────────────────
export const miningAreaQuerySchema = pagination.extend({
  search: z.string().optional(),
});

export const createMiningAreaSchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().optional(),
  description: z.string().optional(),
}).strict();

export const updateMiningAreaSchema = z.object({
  name: z.string().min(1).optional(),
  abbreviation: z.string().optional(),
  description: z.string().optional(),
}).strict();

// ─── MiningLevel ─────────────────────────────────────────────────────────────
export const miningLevelQuerySchema = pagination.extend({
  miningAreaId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const createMiningLevelSchema = z.object({
  miningAreaId: z.string().uuid(),
  name: z.string().min(1),
  abbreviation: z.string().optional(),
  elevation: z.number().optional(),
  description: z.string().optional(),
}).strict();

export const updateMiningLevelSchema = z.object({
  miningAreaId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  abbreviation: z.string().optional(),
  elevation: z.number().optional(),
  description: z.string().optional(),
}).strict();

// ─── MiningLabor ─────────────────────────────────────────────────────────────
export const miningLaborQuerySchema = pagination.extend({
  miningLevelId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const createMiningLaborSchema = z.object({
  miningLevelId: z.string().uuid(),
  name: z.string().min(1),
  abbreviation: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
}).strict();

export const updateMiningLaborSchema = z.object({
  miningLevelId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  abbreviation: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
}).strict();

// ─── Sample ───────────────────────────────────────────────────────────────────
export const sampleQuerySchema = pagination.extend({
  miningLaborId: z.string().uuid().optional(),
  sampleType: z.enum(["SIMPLE", "DOUBLE", "SIMPLE_DOUBLE", "OTHER"]).optional(),
  search: z.string().optional(),
});

export const createSampleSchema = z.object({
  miningLaborId: z.string().uuid(),
  code: z.string().min(1),
  number: z.number().int().optional(),
  sampledAt: z.string().datetime().optional(),
  name: z.string().optional(),
  sampleType: z.enum(["SIMPLE", "DOUBLE", "SIMPLE_DOUBLE", "OTHER"]).optional(),
  placeReference: z.string().optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  description: z.string().optional(),
  observations: z.string().optional(),
}).strict();

export const updateSampleSchema = z.object({
  miningLaborId: z.string().uuid().optional(),
  code: z.string().min(1).optional(),
  number: z.number().int().optional(),
  sampledAt: z.string().datetime().optional(),
  name: z.string().optional(),
  sampleType: z.enum(["SIMPLE", "DOUBLE", "SIMPLE_DOUBLE", "OTHER"]).optional(),
  placeReference: z.string().optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  description: z.string().optional(),
  observations: z.string().optional(),
}).strict();

// ─── Laboratory ───────────────────────────────────────────────────────────────
export const laboratoryQuerySchema = pagination.extend({
  search: z.string().optional(),
});

export const createLaboratorySchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().optional(),
  description: z.string().optional(),
}).strict();

export const updateLaboratorySchema = z.object({
  name: z.string().min(1).optional(),
  abbreviation: z.string().optional(),
  description: z.string().optional(),
}).strict();

// ─── SampleLaboratory ─────────────────────────────────────────────────────────
export const sampleLaboratoryQuerySchema = pagination.extend({
  sampleId: z.string().uuid().optional(),
  laboratoryId: z.string().uuid().optional(),
  slot: z.enum(["L1", "L2", "L3"]).optional(),
});

export const createSampleLaboratorySchema = z.object({
  sampleId: z.string().uuid(),
  laboratoryId: z.string().uuid(),
  slot: z.enum(["L1", "L2", "L3"]),
}).strict();

export const updateSampleLaboratorySchema = z.object({
  sampleId: z.string().uuid().optional(),
  laboratoryId: z.string().uuid().optional(),
  slot: z.enum(["L1", "L2", "L3"]).optional(),
}).strict();

// ─── Element ──────────────────────────────────────────────────────────────────
export const elementQuerySchema = pagination.extend({
  search: z.string().optional(),
  symbol: z.string().optional(),
});

export const createElementSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  defaultUnit: z.string().optional(),
  description: z.string().optional(),
}).strict();

export const updateElementSchema = z.object({
  name: z.string().min(1).optional(),
  symbol: z.string().min(1).optional(),
  defaultUnit: z.string().optional(),
  description: z.string().optional(),
}).strict();

// ─── SampleResult ─────────────────────────────────────────────────────────────
export const sampleResultQuerySchema = pagination.extend({
  sampleId: z.string().uuid().optional(),
  sampleLaboratoryId: z.string().uuid().optional(),
  elementId: z.string().uuid().optional(),
});

export const createSampleResultSchema = z.object({
  sampleId: z.string().uuid(),
  sampleLaboratoryId: z.string().uuid().optional(),
  elementId: z.string().uuid(),
  value: z.number().optional(),
  qualifier: z.string().optional(),
  unit: z.string().optional(),
  sourceColumn: z.string().optional(),
  comments: z.string().optional(),
}).strict();

export const updateSampleResultSchema = z.object({
  sampleId: z.string().uuid().optional(),
  sampleLaboratoryId: z.string().uuid().optional(),
  elementId: z.string().uuid().optional(),
  value: z.number().optional(),
  qualifier: z.string().optional(),
  unit: z.string().optional(),
  sourceColumn: z.string().optional(),
  comments: z.string().optional(),
}).strict();

// ─── SampleQAQC ───────────────────────────────────────────────────────────────
export const sampleQAQCQuerySchema = pagination.extend({
  sampleId: z.string().uuid().optional(),
  type: z.string().optional(),
  passed: z.coerce.boolean().optional(),
});

export const createSampleQAQCSchema = z.object({
  sampleId: z.string().uuid(),
  type: z.string().min(1),
  passed: z.boolean().optional(),
  expectedValue: z.number().optional(),
  obtainedValue: z.number().optional(),
  deviationPercent: z.number().optional(),
  comments: z.string().optional(),
}).strict();

export const updateSampleQAQCSchema = z.object({
  sampleId: z.string().uuid().optional(),
  type: z.string().min(1).optional(),
  passed: z.boolean().optional(),
  expectedValue: z.number().optional(),
  obtainedValue: z.number().optional(),
  deviationPercent: z.number().optional(),
  comments: z.string().optional(),
}).strict();

export const idSchema = z.object({ id: z.string().uuid() });

// ─── Sample with Results + QAQC (bulk transaction) ───────────────────────────
export const createSampleWithResultsSchema = z.object({
  // ── Sample ──────────────────────────────────────────────────────────────────
  miningLaborId: z.string().uuid(),
  code: z.string().min(1),
  number: z.number().int().optional(),
  sampledAt: z.string().datetime().optional(),
  name: z.string().optional(),
  sampleType: z.enum(["SIMPLE", "DOUBLE", "SIMPLE_DOUBLE", "OTHER"]).optional(),
  placeReference: z.string().optional(),
  east: z.number().optional(),
  north: z.number().optional(),
  elevation: z.number().optional(),
  description: z.string().optional(),
  observations: z.string().optional(),
  // ── SampleLaboratory[] ──────────────────────────────────────────────────────
  sampleLabs: z.array(
    z.object({
      slot: z.enum(["L1", "L2", "L3"]),
      laboratoryId: z.string().uuid().optional(),
      laboratory: z.object({
        name: z.string().min(1),
        abbreviation: z.string().optional(),
        description: z.string().optional(),
      }).strict().optional(),
    }).strict().refine(
      (d) => d.laboratoryId || d.laboratory,
      { message: "Each sampleLab entry must have either laboratoryId or laboratory object" }
    )
  ).default([]),
  // ── SampleResult[] ──────────────────────────────────────────────────────────
  results: z.array(
    z.object({
      elementId: z.string().uuid(),
      sampleLaboratoryId: z.string().uuid().optional(),
      slot: z.enum(["L1", "L2", "L3"]).optional(),
      value: z.number().optional(),
      qualifier: z.string().optional(),
      unit: z.string().optional(),
      sourceColumn: z.string().optional(),
      comments: z.string().optional(),
    }).strict()
  ).default([]),
  // ── SampleQAQC[] ────────────────────────────────────────────────────────────
  qaqcRecords: z.array(
    z.object({
      type: z.string().min(1),
      passed: z.boolean().optional(),
      expectedValue: z.number().optional(),
      obtainedValue: z.number().optional(),
      deviationPercent: z.number().optional(),
      comments: z.string().optional(),
    }).strict()
  ).default([]),
}).strict();

// ─── SampleLaboratory with Laboratory (bulk transaction) ──────────────────────
export const createSampleLabWithLaboratorySchema = z.object({
  sampleId: z.string().uuid(),
  slot: z.enum(["L1", "L2", "L3"]),
  laboratoryId: z.string().uuid().optional(),
  laboratory: z.object({
    name: z.string().min(1),
    abbreviation: z.string().optional(),
    description: z.string().optional(),
  }).strict().optional(),
}).strict().refine(
  (d) => d.laboratoryId || d.laboratory,
  { message: "Either laboratoryId or laboratory object must be provided" }
);
