import XLSX from "xlsx";
import type {
  ImportWarning,
  ParsedAlt,
  ParsedColl,
  ParsedLith,
  ParsedMag,
  ParsedMin,
  ParsedRec,
  ParsedSamp,
  ParsedSG,
  ParsedStruct,
  ParsedSurv,
  ParsedWorkbook,
} from "./miningExcel.types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function normalizeHoleId(id: string): string {
  return String(id ?? "")
    .replace(/\s+/g, "")
    .trim();
}

function normalizeKey(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9_]/g, "_");
}

function findColKey(row: Record<string, unknown>, aliases: string[]): string | null {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const found = keys.find((k) => normalizeKey(k) === target);
    if (found !== undefined) return found;
  }
  // Partial match fallback
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const found = keys.find((k) => normalizeKey(k).includes(target));
    if (found !== undefined) return found;
  }
  return null;
}

function parseNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : undefined;
}

function parseStr(v: unknown): string | undefined {
  const s = String(v ?? "").trim();
  return s && s !== "----" ? s : undefined;
}

function isTemplateRow(row: Record<string, unknown>): boolean {
  const vals = Object.values(row).map((v) => String(v ?? "").trim());
  return vals.every((v) => v === "" || v === "----" || v === "0" || v === "1");
}

function readSheetRows(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

// ─── Element column parsing ────────────────────────────────────────────────────

const SAMP_BASE_COLS = new Set([
  "DATASET",
  "HOLE_ID",
  "MFROM",
  "MTO",
  "WIDTH_M",
  "SAMPLEID",
  "SAMPLE_TYPE",
  "SAMPLE_METHOD",
  "QC_CATEGORY",
  "ORIG_SAMPLEID",
  "NGVALUE",
  "DATE_SAMPLED",
  "SAMPLED_BY",
  "DATA_SUBMITTE",
  "COMMENTS",
  "HAS_DUPLICATE",
  "SG",
]);

// Parse element name and unit from column header like "Au (ppm)", "Bi_ppm", "Cu (%)", "As ppm"
function parseElementCol(colName: string): { element: string; unit: string } | null {
  const normalized = colName.trim();

  // Pattern: ELEMENT (UNIT)
  const parenMatch = normalized.match(/^([A-Za-z][A-Za-z0-9]*)\s*\(([^)]+)\)/);
  if (parenMatch) return { element: parenMatch[1], unit: parenMatch[2].trim() };

  // Pattern: ELEMENT_UNIT or ELEMENT UNIT
  const underMatch = normalized.match(/^([A-Za-z][A-Za-z0-9]*)[\s_]+(ppm|ppb|%|g\/t|oz\/t)$/i);
  if (underMatch) return { element: underMatch[1], unit: underMatch[2] };

  // Pattern: ELEMENT_% (e.g., Al_%)
  const pctMatch = normalized.match(/^([A-Za-z][A-Za-z0-9]*)_(%)/);
  if (pctMatch) return { element: pctMatch[1], unit: pctMatch[2] };

  return null;
}

function detectElementCols(
  firstRow: Record<string, unknown>,
): Array<{ key: string; element: string; unit: string }> {
  return Object.keys(firstRow)
    .filter((k) => !SAMP_BASE_COLS.has(normalizeKey(k)))
    .map((k) => {
      const parsed = parseElementCol(k);
      return parsed ? { key: k, ...parsed } : null;
    })
    .filter(Boolean) as Array<{ key: string; element: string; unit: string }>;
}

// ─── DrillHole type mapping ────────────────────────────────────────────────────

function mapDrillType(raw: unknown): string {
  const t = normalizeKey(raw);
  if (t === "DDH" || t.includes("DIAMANTINA")) return "DDH";
  if (t === "RC" || t.includes("CIRCULACION")) return "RC";
  if (t === "AC") return "AC";
  return "OTHER";
}

// ─── Sheet parsers ────────────────────────────────────────────────────────────

function parseColl(
  wb: XLSX.WorkBook,
  defaultZoneName: string,
): { rows: ParsedColl[]; warnings: ImportWarning[] } {
  const raw = readSheetRows(wb, "DHColl");
  const warnings: ImportWarning[] = [];
  const rows: ParsedColl[] = [];

  if (!raw.length) {
    warnings.push({ sheet: "DHColl", message: "Hoja DHColl no encontrada o vacía" });
    return { rows, warnings };
  }

  const ref = raw[0];
  const C = {
    id: findColKey(ref, ["Hole_ID", "HOLEID", "HoleID"]),
    type: findColKey(ref, ["Hole_Type", "HoleType", "HOLE_TYPE"]),
    east: findColKey(ref, ["Orig_East", "East", "X", "ESTE"]),
    north: findColKey(ref, ["Orig_North", "North", "Y", "NORTE"]),
    elev: findColKey(ref, ["Orig_Elev", "Elevation", "Elev", "Z"]),
    depth: findColKey(ref, ["Max_Depth", "MaxDepth", "Depth", "Profundidad"]),
    az: findColKey(ref, ["Azimuth", "Azimut", "Az"]),
    dip: findColKey(ref, ["Dip"]),
    campaign: findColKey(ref, ["Campaign", "Campaña"]),
    year: findColKey(ref, ["Year", "Año"]),
    dataset: findColKey(ref, ["DataSet", "Dataset"]),
  };

  raw.forEach((row, idx) => {
    const rawId = String(row[C.id!] ?? "").trim();
    if (!rawId || rawId === "----") return;
    if (isTemplateRow(row)) return;

    const holeId = normalizeHoleId(rawId);
    const east = parseNum(row[C.east!]);
    const north = parseNum(row[C.north!]);
    const maxDepth = parseNum(row[C.depth!]);

    if (!east || !north || maxDepth === undefined) return;

    // Use DataSet as zone name if no explicit zone
    const datasetVal = parseStr(row[C.dataset!]);
    const zoneName = datasetVal ?? defaultZoneName;

    rows.push({
      holeId,
      rawHoleId: rawId,
      holeType: mapDrillType(row[C.type!]),
      east,
      north,
      elevation: parseNum(row[C.elev!]),
      azimuth: parseNum(row[C.az!]),
      dip: parseNum(row[C.dip!]),
      maxDepth,
      campaign: parseStr(row[C.campaign!]),
      year: parseNum(row[C.year!]),
      zoneName,
      rowIndex: idx + 2,
    });
  });

  return { rows, warnings };
}

function parseSurv(wb: XLSX.WorkBook): { rows: ParsedSurv[]; warnings: ImportWarning[] } {
  const raw = readSheetRows(wb, "DHSurv");
  const warnings: ImportWarning[] = [];
  const rows: ParsedSurv[] = [];

  if (!raw.length) {
    warnings.push({ sheet: "DHSurv", message: "Hoja DHSurv vacía" });
    return { rows, warnings };
  }

  const ref = raw[0];
  const C = {
    id: findColKey(ref, ["Hole_ID", "HoleID"]),
    depth: findColKey(ref, ["Depth", "Profundidad"]),
    az: findColKey(ref, ["MAG_Azimuth", "Orig_Azimuth", "Azimuth", "Az"]),
    dip: findColKey(ref, ["Dip"]),
  };

  raw.forEach((row, idx) => {
    const rawId = String(row[C.id!] ?? "").trim();
    if (!rawId || rawId === "----") return;

    const holeId = normalizeHoleId(rawId);
    const depth = parseNum(row[C.depth!]);
    const azimuth = parseNum(row[C.az!]);
    const dip = parseNum(row[C.dip!]);

    if (depth === undefined || azimuth === undefined || dip === undefined) return;

    rows.push({ holeId, depth, azimuth, dip, rowIndex: idx + 2 });
  });

  return { rows, warnings };
}

function parseSamp(wb: XLSX.WorkBook): { rows: ParsedSamp[]; warnings: ImportWarning[] } {
  const raw = readSheetRows(wb, "DHSamp");
  const warnings: ImportWarning[] = [];
  const rows: ParsedSamp[] = [];

  if (!raw.length) {
    warnings.push({ sheet: "DHSamp", message: "Hoja DHSamp vacía" });
    return { rows, warnings };
  }

  const ref = raw[0];
  const C = {
    id: findColKey(ref, ["Hole_ID", "HoleID"]),
    mFrom: findColKey(ref, ["mFrom", "From", "FromDepth"]),
    mTo: findColKey(ref, ["mTo", "To", "ToDepth"]),
  };

  // Detect element columns
  const elementCols = detectElementCols(ref);

  // Find main Au/Ag/Cu columns
  const auKey = elementCols.find((e) => e.element.toUpperCase() === "AU")?.key ?? null;
  const agKey = elementCols.find((e) => e.element.toUpperCase() === "AG")?.key ?? null;
  const cuKey = elementCols.find((e) => e.element.toUpperCase() === "CU")?.key ?? null;

  raw.forEach((row, idx) => {
    const rawId = String(row[C.id!] ?? "").trim();
    if (!rawId || rawId === "----") return;

    const holeId = normalizeHoleId(rawId);
    const mFrom = parseNum(row[C.mFrom!]);
    const mTo = parseNum(row[C.mTo!]);

    if (mFrom === undefined || mTo === undefined) return;

    const au = parseNum(auKey ? row[auKey] : undefined) ?? 0;
    const ag = parseNum(agKey ? row[agKey] : undefined) ?? 0;
    const cu = parseNum(cuKey ? row[cuKey] : undefined) ?? 0;

    const elements: ParsedSamp["elements"] = [];
    for (const ec of elementCols) {
      const v = parseNum(row[ec.key]);
      if (v !== undefined) {
        elements.push({ element: ec.element, value: v, unit: ec.unit });
      }
    }

    rows.push({ holeId, mFrom, mTo, au, ag, cu, elements, rowIndex: idx + 2 });
  });

  return { rows, warnings };
}

function parseLith(wb: XLSX.WorkBook): { rows: ParsedLith[]; warnings: ImportWarning[] } {
  const raw = readSheetRows(wb, "DHLith");
  const warnings: ImportWarning[] = [];
  const rows: ParsedLith[] = [];

  if (!raw.length) return { rows, warnings };

  const ref = raw[0];
  const C = {
    id: findColKey(ref, ["Hole_ID"]),
    mFrom: findColKey(ref, ["mFrom", "From"]),
    mTo: findColKey(ref, ["mTo", "To"]),
    rock: findColKey(ref, ["Rock_Type", "RockType", "Rock"]),
    code: findColKey(ref, ["Lith_Code", "LithCode", "Code"]),
    color: findColKey(ref, ["Color"]),
    grain: findColKey(ref, ["Grain_Size", "GrainSize", "Grain"]),
    texture: findColKey(ref, ["Texture"]),
    weathering: findColKey(ref, ["Weathering"]),
    obs: findColKey(ref, ["Lith_Obs", "LithObs", "Obs", "Comments"]),
  };

  raw.forEach((row, idx) => {
    const rawId = String(row[C.id!] ?? "").trim();
    if (!rawId || rawId === "----") return;

    const holeId = normalizeHoleId(rawId);
    const mFrom = parseNum(row[C.mFrom!]);
    const mTo = parseNum(row[C.mTo!]);
    if (mFrom === undefined || mTo === undefined) return;

    rows.push({
      holeId,
      mFrom,
      mTo,
      rockType: parseStr(row[C.rock!]),
      code: parseStr(row[C.code!]),
      color: parseStr(row[C.color!]),
      grainSize: parseStr(row[C.grain!]),
      texture: parseStr(row[C.texture!]),
      weathering: parseStr(row[C.weathering!]),
      comments: parseStr(row[C.obs!]),
      rowIndex: idx + 2,
    });
  });

  return { rows, warnings };
}

function parseMin(wb: XLSX.WorkBook): { rows: ParsedMin[]; warnings: ImportWarning[] } {
  const raw = readSheetRows(wb, "DHMin");
  const warnings: ImportWarning[] = [];
  const rows: ParsedMin[] = [];

  if (!raw.length) return { rows, warnings };

  const ref = raw[0];
  const C = {
    id: findColKey(ref, ["Hole_ID"]),
    mFrom: findColKey(ref, ["mFrom", "From"]),
    mTo: findColKey(ref, ["mTo", "To"]),
    comments: findColKey(ref, ["Comments"]),
  };

  raw.forEach((row, idx) => {
    const rawId = String(row[C.id!] ?? "").trim();
    if (!rawId || rawId === "----") return;

    const holeId = normalizeHoleId(rawId);
    const mFrom = parseNum(row[C.mFrom!]);
    const mTo = parseNum(row[C.mTo!]);
    if (mFrom === undefined || mTo === undefined) return;

    const mineralizations: ParsedMin["mineralizations"] = [];
    for (let n = 1; n <= 5; n++) {
      const codeKey = findColKey(row, [`Min${n}_Code`]);
      const mineral = parseStr(row[codeKey!]);
      if (!mineral) continue;

      const pctKey = findColKey(row, [`Min${n}_Pct`]);
      const styleKey = findColKey(row, [`Min${n}_Style`]);
      mineralizations.push({
        mineral,
        percentage: parseNum(row[pctKey!]),
        style: parseStr(row[styleKey!]),
      });
    }

    if (!mineralizations.length) return;

    rows.push({
      holeId,
      mFrom,
      mTo,
      mineralizations,
      comments: parseStr(row[C.comments!]),
      rowIndex: idx + 2,
    });
  });

  return { rows, warnings };
}

function parseAlt(wb: XLSX.WorkBook): { rows: ParsedAlt[]; warnings: ImportWarning[] } {
  const raw = readSheetRows(wb, "DHAlt");
  const warnings: ImportWarning[] = [];
  const rows: ParsedAlt[] = [];

  if (!raw.length) return { rows, warnings };

  const ref = raw[0];
  const C = {
    id: findColKey(ref, ["Hole_ID"]),
    mFrom: findColKey(ref, ["mFrom", "From"]),
    mTo: findColKey(ref, ["mTo", "To"]),
    comments: findColKey(ref, ["Comments"]),
  };

  raw.forEach((row, idx) => {
    const rawId = String(row[C.id!] ?? "").trim();
    if (!rawId || rawId === "----") return;

    const holeId = normalizeHoleId(rawId);
    const mFrom = parseNum(row[C.mFrom!]);
    const mTo = parseNum(row[C.mTo!]);
    if (mFrom === undefined || mTo === undefined) return;

    const alterations: ParsedAlt["alterations"] = [];
    for (let n = 1; n <= 3; n++) {
      const codeKey = findColKey(row, [`Alt${n}_Code`]);
      const type = parseStr(row[codeKey!]);
      if (!type) continue;

      const intKey = findColKey(row, [`Alt${n}_Int`, `Alt${n}_Intensity`]);
      const styleKey = findColKey(row, [`Alt${n}_Style`, `Alt${n}_Description`]);
      alterations.push({
        type,
        intensity: parseNum(row[intKey!]),
        description: parseStr(row[styleKey!]),
      });
    }

    if (!alterations.length) return;

    rows.push({
      holeId,
      mFrom,
      mTo,
      alterations,
      comments: parseStr(row[C.comments!]),
      rowIndex: idx + 2,
    });
  });

  return { rows, warnings };
}

function parseRec(wb: XLSX.WorkBook): { rows: ParsedRec[]; warnings: ImportWarning[] } {
  const raw = readSheetRows(wb, "DHRec");
  const warnings: ImportWarning[] = [];
  const rows: ParsedRec[] = [];

  if (!raw.length) return { rows, warnings };

  const ref = raw[0];
  const C = {
    id: findColKey(ref, ["Hole_ID"]),
    mFrom: findColKey(ref, ["mFrom", "From"]),
    mTo: findColKey(ref, ["mTo", "To"]),
    rec: findColKey(ref, ["Rec_Pct", "Recovery", "RecPct"]),
    rqd: findColKey(ref, ["RQD_Pct", "RQD"]),
    loss: findColKey(ref, ["Core_Loss", "CoreLoss"]),
    comments: findColKey(ref, ["Comments"]),
  };

  raw.forEach((row, idx) => {
    const rawId = String(row[C.id!] ?? "").trim();
    if (!rawId || rawId === "----") return;

    const holeId = normalizeHoleId(rawId);
    const mFrom = parseNum(row[C.mFrom!]);
    const mTo = parseNum(row[C.mTo!]);
    if (mFrom === undefined || mTo === undefined) return;

    rows.push({
      holeId,
      mFrom,
      mTo,
      recoveryPercent: parseNum(row[C.rec!]),
      rqdPercent: parseNum(row[C.rqd!]),
      coreLoss: parseNum(row[C.loss!]),
      comments: parseStr(row[C.comments!]),
      rowIndex: idx + 2,
    });
  });

  return { rows, warnings };
}

function parseSG(wb: XLSX.WorkBook): { rows: ParsedSG[]; warnings: ImportWarning[] } {
  const raw = readSheetRows(wb, "DHSG");
  const warnings: ImportWarning[] = [];
  const rows: ParsedSG[] = [];

  if (!raw.length) return { rows, warnings };

  const ref = raw[0];
  const C = {
    id: findColKey(ref, ["Hole_ID"]),
    mFrom: findColKey(ref, ["mFrom", "From"]),
    mTo: findColKey(ref, ["mTo", "To"]),
    sg: findColKey(ref, ["Reading", "SG", "SpecificGravity"]),
    method: findColKey(ref, ["SG_Method", "Method"]),
    dry: findColKey(ref, ["Dry_Density", "DryDensity"]),
    wet: findColKey(ref, ["Wet_Density", "WetDensity"]),
    comments: findColKey(ref, ["Comments"]),
  };

  raw.forEach((row, idx) => {
    const rawId = String(row[C.id!] ?? "").trim();
    if (!rawId || rawId === "----") return;

    const holeId = normalizeHoleId(rawId);
    const mFrom = parseNum(row[C.mFrom!]);
    const mTo = parseNum(row[C.mTo!]);
    const sg = parseNum(row[C.sg!]);
    if (mFrom === undefined || mTo === undefined || sg === undefined) return;

    rows.push({
      holeId,
      mFrom,
      mTo,
      specificGravity: sg,
      method: parseStr(row[C.method!]),
      dryDensity: parseNum(row[C.dry!]),
      wetDensity: parseNum(row[C.wet!]),
      comments: parseStr(row[C.comments!]),
      rowIndex: idx + 2,
    });
  });

  return { rows, warnings };
}

function parseMag(wb: XLSX.WorkBook): { rows: ParsedMag[]; warnings: ImportWarning[] } {
  const raw = readSheetRows(wb, "DHMag");
  const warnings: ImportWarning[] = [];
  const rows: ParsedMag[] = [];

  if (!raw.length) return { rows, warnings };

  const ref = raw[0];
  const C = {
    id: findColKey(ref, ["Hole_ID"]),
    mFrom: findColKey(ref, ["mFrom", "From"]),
    mTo: findColKey(ref, ["mTo", "To"]),
    // The real column is "Mag_Suc 0.001" — search broadly
    value: findColKey(ref, ["Mag_Suc", "Reading", "Value", "Susceptibility"]),
    unit: findColKey(ref, ["UnitCode", "Unit"]),
    instrument: findColKey(ref, ["Instrument", "Core_Diameter"]),
    comments: findColKey(ref, ["Comments"]),
  };

  raw.forEach((row, idx) => {
    const rawId = String(row[C.id!] ?? "").trim();
    if (!rawId || rawId === "----") return;

    const holeId = normalizeHoleId(rawId);
    const mFrom = parseNum(row[C.mFrom!]);
    const mTo = parseNum(row[C.mTo!]);
    const value = parseNum(row[C.value!]);
    if (mFrom === undefined || mTo === undefined || value === undefined) return;

    rows.push({
      holeId,
      mFrom,
      mTo,
      value,
      unit: parseStr(row[C.unit!]) ?? "10^-3 SI",
      instrument: parseStr(row[C.instrument!]),
      comments: parseStr(row[C.comments!]),
      rowIndex: idx + 2,
    });
  });

  return { rows, warnings };
}

function parseStruct(wb: XLSX.WorkBook): { rows: ParsedStruct[]; warnings: ImportWarning[] } {
  const raw = readSheetRows(wb, "DHStruct");
  const warnings: ImportWarning[] = [];
  const rows: ParsedStruct[] = [];

  if (!raw.length) return { rows, warnings };

  const ref = raw[0];
  const C = {
    id: findColKey(ref, ["Hole_ID"]),
    // DHStruct uses mFROM/mTO (uppercase)
    mFrom: findColKey(ref, ["mFROM", "mFrom", "From"]),
    mTo: findColKey(ref, ["mTO", "mTo", "To"]),
    type: findColKey(ref, ["Structure_Type", "StructureType"]),
    angle: findColKey(ref, ["Angle"]),
    width: findColKey(ref, ["Width_m", "Width"]),
    orient: findColKey(ref, ["Orientation", "Estructure Name", "EstructureName"]),
    desc: findColKey(ref, ["Rxservation", "Description", "Comments"]),
  };

  raw.forEach((row, idx) => {
    const rawId = String(row[C.id!] ?? "").trim();
    if (!rawId || rawId === "----") return;

    const holeId = normalizeHoleId(rawId);
    const mFrom = parseNum(row[C.mFrom!]);
    const mTo = parseNum(row[C.mTo!]);
    const structureType = parseStr(row[C.type!]);
    if (mFrom === undefined || mTo === undefined || !structureType) return;

    rows.push({
      holeId,
      mFrom,
      mTo,
      structureType,
      angle: parseNum(row[C.angle!]),
      width: parseNum(row[C.width!]),
      orientation: parseStr(row[C.orient!]),
      description: parseStr(row[C.desc!]),
      rowIndex: idx + 2,
    });
  });

  return { rows, warnings };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseWorkbook(buffer: Buffer, defaultZoneName: string): ParsedWorkbook {
  const wb = XLSX.read(buffer, { cellDates: true, raw: false });

  const warnings: ImportWarning[] = [];

  const collResult = parseColl(wb, defaultZoneName);
  const survResult = parseSurv(wb);
  const sampResult = parseSamp(wb);
  const lithResult = parseLith(wb);
  const minResult = parseMin(wb);
  const altResult = parseAlt(wb);
  const recResult = parseRec(wb);
  const sgResult = parseSG(wb);
  const magResult = parseMag(wb);
  const structResult = parseStruct(wb);

  warnings.push(
    ...collResult.warnings,
    ...survResult.warnings,
    ...sampResult.warnings,
    ...lithResult.warnings,
    ...minResult.warnings,
    ...altResult.warnings,
    ...recResult.warnings,
    ...sgResult.warnings,
    ...magResult.warnings,
    ...structResult.warnings,
  );

  // Warn about Samp sheet (surface samples — not imported)
  if (wb.Sheets["Samp"]) {
    warnings.push({
      sheet: "Samp",
      message:
        "La hoja Samp fue detectada pero no será importada: corresponde a muestras superficiales independientes (módulo surfaceExploration).",
    });
  }

  return {
    coll: collResult.rows,
    surv: survResult.rows,
    samp: sampResult.rows,
    lith: lithResult.rows,
    min: minResult.rows,
    alt: altResult.rows,
    rec: recResult.rows,
    sg: sgResult.rows,
    mag: magResult.rows,
    struct: structResult.rows,
    warnings,
  };
}
