export interface ImportError {
  sheet: string;
  row: number;
  field: string;
  message: string;
}

export interface ImportWarning {
  sheet: string;
  message: string;
}

export interface ParsedColl {
  holeId: string;
  rawHoleId: string;
  holeType: string;
  east: number;
  north: number;
  elevation?: number;
  azimuth?: number;
  dip?: number;
  maxDepth: number;
  campaign?: string;
  year?: number;
  zoneName: string;
  rowIndex: number;
}

export interface ParsedSurv {
  holeId: string;
  depth: number;
  azimuth: number;
  dip: number;
  rowIndex: number;
}

export interface ParsedSamp {
  holeId: string;
  mFrom: number;
  mTo: number;
  au: number;
  ag: number;
  cu: number;
  elements: Array<{ element: string; value: number; unit: string }>;
  rowIndex: number;
}

export interface ParsedLith {
  holeId: string;
  mFrom: number;
  mTo: number;
  rockType?: string;
  code?: string;
  color?: string;
  grainSize?: string;
  texture?: string;
  weathering?: string;
  comments?: string;
  rowIndex: number;
}

export interface ParsedMin {
  holeId: string;
  mFrom: number;
  mTo: number;
  mineralizations: Array<{ mineral: string; percentage?: number; style?: string }>;
  comments?: string;
  rowIndex: number;
}

export interface ParsedAlt {
  holeId: string;
  mFrom: number;
  mTo: number;
  alterations: Array<{ type: string; intensity?: number; description?: string }>;
  comments?: string;
  rowIndex: number;
}

export interface ParsedRec {
  holeId: string;
  mFrom: number;
  mTo: number;
  recoveryPercent?: number;
  rqdPercent?: number;
  coreLoss?: number;
  comments?: string;
  rowIndex: number;
}

export interface ParsedSG {
  holeId: string;
  mFrom: number;
  mTo: number;
  specificGravity: number;
  method?: string;
  dryDensity?: number;
  wetDensity?: number;
  comments?: string;
  rowIndex: number;
}

export interface ParsedMag {
  holeId: string;
  mFrom: number;
  mTo: number;
  value: number;
  unit?: string;
  instrument?: string;
  comments?: string;
  rowIndex: number;
}

export interface ParsedStruct {
  holeId: string;
  mFrom: number;
  mTo: number;
  structureType: string;
  angle?: number;
  width?: number;
  orientation?: string;
  description?: string;
  comments?: string;
  rowIndex: number;
}

export interface ParsedWorkbook {
  coll: ParsedColl[];
  surv: ParsedSurv[];
  samp: ParsedSamp[];
  lith: ParsedLith[];
  min: ParsedMin[];
  alt: ParsedAlt[];
  rec: ParsedRec[];
  sg: ParsedSG[];
  mag: ParsedMag[];
  struct: ParsedStruct[];
  warnings: ImportWarning[];
}

export interface ValidateSummary {
  drillHoles: number;
  surveys: number;
  intervals: number;
  assays: number;
  assayValues: number;
  lithologies: number;
  mineralizations: number;
  alterations: number;
  recoveries: number;
  densities: number;
  magneticSusceptibilities: number;
  geologicalStructures: number;
}

export interface ValidateResult {
  valid: boolean;
  errors: ImportError[];
  warnings: ImportWarning[];
  summary: ValidateSummary;
}

export interface ExecuteSummary {
  projectsCreated: number;
  zonesCreated: number;
  drillHolesCreated: number;
  surveysCreated: number;
  intervalsCreated: number;
  assaysCreated: number;
  assayValuesCreated: number;
  lithologiesCreated: number;
  mineralizationsCreated: number;
  alterationsCreated: number;
  recoveriesCreated: number;
  densitiesCreated: number;
  magneticSusceptibilitiesCreated: number;
  geologicalStructuresCreated: number;
}

export interface ImportOptions {
  projectName: string;
  defaultZoneName: string;
  userId: number;
}
