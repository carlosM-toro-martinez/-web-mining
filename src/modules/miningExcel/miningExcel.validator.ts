import type { ImportError, ParsedWorkbook, ValidateResult } from "./miningExcel.types.js";

export function validateWorkbook(wb: ParsedWorkbook): ValidateResult {
  const errors: ImportError[] = [];

  // Build set of known holeIds from DHColl
  const knownHoleIds = new Set(wb.coll.map((r) => r.holeId));

  // ── DHColl ────────────────────────────────────────────────────────────────────
  if (!wb.coll.length) {
    errors.push({
      sheet: "DHColl",
      row: 1,
      field: "Hole_ID",
      message: "La hoja DHColl no contiene sondajes válidos. Es obligatoria.",
    });
  }

  wb.coll.forEach((r) => {
    if (!r.holeId) {
      errors.push({ sheet: "DHColl", row: r.rowIndex, field: "Hole_ID", message: "Hole_ID vacío" });
    }
    if (r.east === 0 && r.north === 0) {
      errors.push({
        sheet: "DHColl",
        row: r.rowIndex,
        field: "Orig_East/Orig_North",
        message: `Sondaje ${r.holeId}: coordenadas Este/Norte son 0`,
      });
    }
    if (r.maxDepth <= 0) {
      errors.push({
        sheet: "DHColl",
        row: r.rowIndex,
        field: "Max_Depth",
        message: `Sondaje ${r.holeId}: Max_Depth debe ser positivo`,
      });
    }
  });

  // ── DHSamp ────────────────────────────────────────────────────────────────────
  if (!wb.samp.length) {
    errors.push({
      sheet: "DHSamp",
      row: 1,
      field: "general",
      message: "La hoja DHSamp no contiene filas válidas. Es obligatoria.",
    });
  }

  wb.samp.forEach((r) => {
    if (!knownHoleIds.has(r.holeId)) {
      errors.push({
        sheet: "DHSamp",
        row: r.rowIndex,
        field: "Hole_ID",
        message: `El sondaje '${r.holeId}' no existe en DHColl`,
      });
    }
    if (r.mTo <= r.mFrom) {
      errors.push({
        sheet: "DHSamp",
        row: r.rowIndex,
        field: "mTo",
        message: `Sondaje ${r.holeId} fila ${r.rowIndex}: mTo (${r.mTo}) debe ser mayor que mFrom (${r.mFrom})`,
      });
    }
    const collHole = wb.coll.find((c) => c.holeId === r.holeId);
    if (collHole && r.mTo > collHole.maxDepth + 0.01) {
      errors.push({
        sheet: "DHSamp",
        row: r.rowIndex,
        field: "mTo",
        message: `Sondaje ${r.holeId}: mTo=${r.mTo} supera Max_Depth=${collHole.maxDepth}`,
      });
    }
  });

  // ── DHSurv ────────────────────────────────────────────────────────────────────
  wb.surv.forEach((r) => {
    if (!knownHoleIds.has(r.holeId)) {
      errors.push({
        sheet: "DHSurv",
        row: r.rowIndex,
        field: "Hole_ID",
        message: `El sondaje '${r.holeId}' no existe en DHColl`,
      });
    }
    if (r.azimuth < 0 || r.azimuth > 360) {
      errors.push({
        sheet: "DHSurv",
        row: r.rowIndex,
        field: "Azimuth",
        message: `Sondaje ${r.holeId}: azimuth=${r.azimuth} fuera de rango [0, 360]`,
      });
    }
    if (r.dip < -90 || r.dip > 90) {
      errors.push({
        sheet: "DHSurv",
        row: r.rowIndex,
        field: "Dip",
        message: `Sondaje ${r.holeId}: dip=${r.dip} fuera de rango [-90, 90]`,
      });
    }
  });

  // ── DHLith ───────────────────────────────────────────────────────────────────
  wb.lith.forEach((r) => {
    if (!knownHoleIds.has(r.holeId)) {
      errors.push({
        sheet: "DHLith",
        row: r.rowIndex,
        field: "Hole_ID",
        message: `El sondaje '${r.holeId}' no existe en DHColl`,
      });
    }
    if (r.mTo <= r.mFrom) {
      errors.push({
        sheet: "DHLith",
        row: r.rowIndex,
        field: "mTo",
        message: `mTo (${r.mTo}) debe ser mayor que mFrom (${r.mFrom})`,
      });
    }
  });

  // ── Other sheets — only validate holeId existence ─────────────────────────
  const otherSheets: Array<{ rows: Array<{ holeId: string; rowIndex: number }>; name: string }> = [
    { rows: wb.min, name: "DHMin" },
    { rows: wb.alt, name: "DHAlt" },
    { rows: wb.rec, name: "DHRec" },
    { rows: wb.sg, name: "DHSG" },
    { rows: wb.mag, name: "DHMag" },
    { rows: wb.struct, name: "DHStruct" },
  ];

  for (const { rows, name } of otherSheets) {
    rows.forEach((r) => {
      if (!knownHoleIds.has(r.holeId)) {
        errors.push({
          sheet: name,
          row: r.rowIndex,
          field: "Hole_ID",
          message: `El sondaje '${r.holeId}' no existe en DHColl`,
        });
      }
    });
  }

  // ── Summary counts ────────────────────────────────────────────────────────
  const intervalKeys = new Set<string>();
  wb.samp.forEach((r) => intervalKeys.add(`${r.holeId}|${r.mFrom}|${r.mTo}`));
  wb.lith.forEach((r) => intervalKeys.add(`${r.holeId}|${r.mFrom}|${r.mTo}`));
  wb.min.forEach((r) => intervalKeys.add(`${r.holeId}|${r.mFrom}|${r.mTo}`));
  wb.rec.forEach((r) => intervalKeys.add(`${r.holeId}|${r.mFrom}|${r.mTo}`));
  wb.sg.forEach((r) => intervalKeys.add(`${r.holeId}|${r.mFrom}|${r.mTo}`));
  wb.mag.forEach((r) => intervalKeys.add(`${r.holeId}|${r.mFrom}|${r.mTo}`));
  wb.struct.forEach((r) => intervalKeys.add(`${r.holeId}|${r.mFrom}|${r.mTo}`));
  wb.alt.forEach((r) => intervalKeys.add(`${r.holeId}|${r.mFrom}|${r.mTo}`));

  const totalAssayValues = wb.samp.reduce((acc, r) => acc + r.elements.length, 0);
  const totalMins = wb.min.reduce((acc, r) => acc + r.mineralizations.length, 0);
  const totalAlts = wb.alt.reduce((acc, r) => acc + r.alterations.length, 0);

  return {
    valid: errors.length === 0,
    errors,
    warnings: wb.warnings,
    summary: {
      drillHoles: wb.coll.length,
      surveys: wb.surv.length,
      intervals: intervalKeys.size,
      assays: wb.samp.length,
      assayValues: totalAssayValues,
      lithologies: wb.lith.length,
      mineralizations: totalMins,
      alterations: totalAlts,
      recoveries: wb.rec.length,
      densities: wb.sg.length,
      magneticSusceptibilities: wb.mag.length,
      geologicalStructures: wb.struct.length,
    },
  };
}
