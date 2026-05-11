import { z } from "zod";

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const projectQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
});

export const createProjectSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    location: z.string().optional(),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    location: z.string().optional(),
  })
  .strict();

export const zoneQuerySchema = paginationSchema.extend({
  projectId: z.coerce.number().int().positive(),
});

export const createZoneSchema = z
  .object({
    projectId: z.coerce.number().int().positive(),
    name: z.string().min(1),
    description: z.string().optional(),
  })
  .strict();

export const updateZoneSchema = z
  .object({
    projectId: z.coerce.number().int().positive().optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  })
  .strict();

export const drillHoleQuerySchema = paginationSchema.extend({
  zoneId: z.coerce.number().int().positive(),
});

export const createDrillHoleSchema = z
  .object({
    projectId: z.coerce.number().int().positive(),
    zoneId: z.coerce.number().int().positive(),
    name: z.string().min(1),
    east: z.number(),
    north: z.number(),
    elevation: z.number().optional(),
    depth: z.number().min(0),
    azimuth: z.number().optional(),
    dip: z.number().optional(),
    type: z.enum(["DDH", "RC", "AC", "OTHER"]),
    campaign: z.string().optional(),
    year: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const updateDrillHoleSchema = z
  .object({
    projectId: z.coerce.number().int().positive().optional(),
    zoneId: z.coerce.number().int().positive().optional(),
    name: z.string().min(1).optional(),
    east: z.number().optional(),
    north: z.number().optional(),
    elevation: z.number().optional(),
    depth: z.number().min(0).optional(),
    azimuth: z.number().optional(),
    dip: z.number().optional(),
    type: z.enum(["DDH", "RC", "AC", "OTHER"]).optional(),
    campaign: z.string().optional(),
    year: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const intervalQuerySchema = paginationSchema.extend({
  drillHoleId: z.coerce.number().int().positive(),
});

export const createIntervalSchema = z
  .object({
    drillHoleId: z.coerce.number().int().positive(),
    fromDepth: z.number(),
    toDepth: z.number(),
  })
  .strict();

export const updateIntervalSchema = z
  .object({
    drillHoleId: z.coerce.number().int().positive().optional(),
    fromDepth: z.number().optional(),
    toDepth: z.number().optional(),
  })
  .strict();

export const assayQuerySchema = paginationSchema.extend({
  intervalId: z.coerce.number().int().positive(),
});

export const createAssaySchema = z
  .object({
    intervalId: z.coerce.number().int().positive(),
    au: z.number().min(0),
    cu: z.number().min(0),
    ag: z.number().min(0),
    assayMethod: z.enum(["AAS", "ICP", "XRF", "OTHER"]),
    laboratory: z.string().optional(),
  })
  .strict();

export const updateAssaySchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    au: z.number().min(0).optional(),
    cu: z.number().min(0).optional(),
    ag: z.number().min(0).optional(),
    assayMethod: z.enum(["AAS", "ICP", "XRF", "OTHER"]).optional(),
    laboratory: z.string().optional(),
  })
  .strict();

export const lithologyQuerySchema = paginationSchema.extend({
  intervalId: z.coerce.number().int().positive(),
});

export const createLithologySchema = z
  .object({
    intervalId: z.coerce.number().int().positive(),
    rockType: z.string().optional(),
    code: z.string().optional(),
    color: z.string().optional(),
    grainSize: z.string().optional(),
    texture: z.string().optional(),
    weathering: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

export const updateLithologySchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    rockType: z.string().optional(),
    code: z.string().optional(),
    color: z.string().optional(),
    grainSize: z.string().optional(),
    texture: z.string().optional(),
    weathering: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

export const qaqcQuerySchema = paginationSchema.extend({
  assayId: z.coerce.number().int().positive(),
});

export const createQAQCSchema = z
  .object({
    assayId: z.coerce.number().int().positive(),
    type: z.enum(["BLANK", "DUPLICATE", "STANDARD"]),
    passed: z.boolean(),
    notes: z.string().optional(),
  })
  .strict();

export const updateQAQCSchema = z
  .object({
    assayId: z.coerce.number().int().positive().optional(),
    type: z.enum(["BLANK", "DUPLICATE", "STANDARD"]).optional(),
    passed: z.boolean().optional(),
    notes: z.string().optional(),
  })
  .strict();

export const resourceQuerySchema = paginationSchema.extend({
  projectId: z.coerce.number().int().positive(),
});

export const createResourceSchema = z
  .object({
    projectId: z.coerce.number().int().positive(),
    type: z.enum(["OPEN_PIT", "UNDERGROUND"]),
    category: z.enum(["MEASURED", "INDICATED", "INFERRED"]),
    cutoff: z.number().min(0),
    tonnes: z.number().min(0),
    au: z.number().min(0),
    cu: z.number().min(0),
    ag: z.number().min(0),
    cuEq: z.number().min(0),
    description: z.string().optional(),
  })
  .strict();

export const updateResourceSchema = z
  .object({
    projectId: z.coerce.number().int().positive().optional(),
    type: z.enum(["OPEN_PIT", "UNDERGROUND"]).optional(),
    category: z.enum(["MEASURED", "INDICATED", "INFERRED"]).optional(),
    cutoff: z.number().min(0).optional(),
    tonnes: z.number().min(0).optional(),
    au: z.number().min(0).optional(),
    cu: z.number().min(0).optional(),
    ag: z.number().min(0).optional(),
    cuEq: z.number().min(0).optional(),
    description: z.string().optional(),
  })
  .strict();

// ─── DrillHoleSurvey ─────────────────────────────────────────────────────────
export const drillHoleSurveyQuerySchema = paginationSchema.extend({
  drillHoleId: z.coerce.number().int().positive().optional(),
});

export const createDrillHoleSurveySchema = z
  .object({
    drillHoleId: z.coerce.number().int().positive().optional(),
    depth: z.number(),
    azimuth: z.number(),
    dip: z.number(),
  })
  .strict();

export const updateDrillHoleSurveySchema = z
  .object({
    drillHoleId: z.coerce.number().int().positive().optional(),
    depth: z.number().optional(),
    azimuth: z.number().optional(),
    dip: z.number().optional(),
  })
  .strict();

// ─── AssayValue ───────────────────────────────────────────────────────────────
export const assayValueQuerySchema = paginationSchema.extend({
  assayId: z.coerce.number().int().positive().optional(),
  element: z.string().optional(),
});

export const createAssayValueSchema = z
  .object({
    assayId: z.coerce.number().int().positive().optional(),
    element: z.string().min(1),
    value: z.number(),
    unit: z.string().optional(),
    detectionLimit: z.number().optional(),
  })
  .strict();

export const updateAssayValueSchema = z
  .object({
    assayId: z.coerce.number().int().positive().optional(),
    element: z.string().min(1).optional(),
    value: z.number().optional(),
    unit: z.string().optional(),
    detectionLimit: z.number().optional(),
  })
  .strict();

// ─── Alteration ───────────────────────────────────────────────────────────────
export const alterationQuerySchema = paginationSchema.extend({
  intervalId: z.coerce.number().int().positive().optional(),
});

export const createAlterationSchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    type: z.string().min(1),
    intensity: z.number().min(0).max(100).optional(),
    description: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

export const updateAlterationSchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    type: z.string().min(1).optional(),
    intensity: z.number().min(0).max(100).optional(),
    description: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

// ─── Mineralization ───────────────────────────────────────────────────────────
export const mineralizationQuerySchema = paginationSchema.extend({
  intervalId: z.coerce.number().int().positive().optional(),
});

export const createMineralizationSchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    mineral: z.string().min(1),
    percentage: z.number().min(0).max(100).optional(),
    style: z.string().optional(),
    habit: z.string().optional(),
    description: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

export const updateMineralizationSchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    mineral: z.string().min(1).optional(),
    percentage: z.number().min(0).max(100).optional(),
    style: z.string().optional(),
    habit: z.string().optional(),
    description: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

// ─── GeologicalStructure ──────────────────────────────────────────────────────
export const geologicalStructureQuerySchema = paginationSchema.extend({
  intervalId: z.coerce.number().int().positive().optional(),
});

export const createGeologicalStructureSchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    structureType: z.string().min(1),
    angle: z.number().optional(),
    width: z.number().min(0).optional(),
    orientation: z.string().optional(),
    description: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

export const updateGeologicalStructureSchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    structureType: z.string().min(1).optional(),
    angle: z.number().optional(),
    width: z.number().min(0).optional(),
    orientation: z.string().optional(),
    description: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

// ─── Recovery ─────────────────────────────────────────────────────────────────
export const recoveryQuerySchema = paginationSchema.extend({
  intervalId: z.coerce.number().int().positive().optional(),
});

export const createRecoverySchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    recoveryPercent: z.number().min(0).max(100).optional(),
    rqdPercent: z.number().min(0).max(100).optional(),
    coreLoss: z.number().min(0).optional(),
    comments: z.string().optional(),
  })
  .strict();

export const updateRecoverySchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    recoveryPercent: z.number().min(0).max(100).optional(),
    rqdPercent: z.number().min(0).max(100).optional(),
    coreLoss: z.number().min(0).optional(),
    comments: z.string().optional(),
  })
  .strict();

// ─── Density ──────────────────────────────────────────────────────────────────
export const densityQuerySchema = paginationSchema.extend({
  intervalId: z.coerce.number().int().positive().optional(),
});

export const createDensitySchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    specificGravity: z.number().positive(),
    method: z.string().optional(),
    dryDensity: z.number().positive().optional(),
    wetDensity: z.number().positive().optional(),
    comments: z.string().optional(),
  })
  .strict();

export const updateDensitySchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    specificGravity: z.number().positive().optional(),
    method: z.string().optional(),
    dryDensity: z.number().positive().optional(),
    wetDensity: z.number().positive().optional(),
    comments: z.string().optional(),
  })
  .strict();

// ─── MagneticSusceptibility ───────────────────────────────────────────────────
export const magneticSusceptibilityQuerySchema = paginationSchema.extend({
  intervalId: z.coerce.number().int().positive().optional(),
});

export const createMagneticSusceptibilitySchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    value: z.number(),
    unit: z.string().optional(),
    instrument: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

export const updateMagneticSusceptibilitySchema = z
  .object({
    intervalId: z.coerce.number().int().positive().optional(),
    value: z.number().optional(),
    unit: z.string().optional(),
    instrument: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict();

// ─── SignificantIntercept ─────────────────────────────────────────────────────
export const significantInterceptQuerySchema = paginationSchema.extend({
  drillHoleId: z.coerce.number().int().positive().optional(),
  zoneId: z.coerce.number().int().positive().optional(),
});

export const createSignificantInterceptSchema = z
  .object({
    drillHoleId: z.coerce.number().int().positive(),
    isIncluding: z.boolean().optional(),
    fromDepth: z.number(),
    toDepth: z.number(),
    width: z.number().min(0),
    trueWidth: z.number().min(0).optional(),
    au: z.number().min(0).optional(),
    cu: z.number().min(0).optional(),
    ag: z.number().min(0).optional(),
    comments: z.string().optional(),
  })
  .strict();

export const updateSignificantInterceptSchema = z
  .object({
    drillHoleId: z.coerce.number().int().positive().optional(),
    isIncluding: z.boolean().optional(),
    fromDepth: z.number().optional(),
    toDepth: z.number().optional(),
    width: z.number().min(0).optional(),
    trueWidth: z.number().min(0).optional(),
    au: z.number().min(0).optional(),
    cu: z.number().min(0).optional(),
    ag: z.number().min(0).optional(),
    comments: z.string().optional(),
  })
  .strict();
