import type { ImportWarning, ParsedWorkbook, ValidateResult } from "./miningExcel.types.js";

export function validateWorkbook(wb: ParsedWorkbook): ValidateResult {
  const warnings: ImportWarning[] = [...wb.warnings];

  // Build set of known holeIds from DHColl
  const knownHoleIds = new Set(wb.coll.map((r) => r.holeId));

  // ── DHColl ────────────────────────────────────────────────────────────────────
  if (!wb.coll.length) {
    warnings.push({
      sheet: "DHColl",
      message: "La hoja DHColl no contiene sondajes válidos. Se importará sin datos de collar.",
    });
  }

  const collZeroCoords = wb.coll.filter((r) => r.east === 0 && r.north === 0);
  if (collZeroCoords.length) {
    warnings.push({
      sheet: "DHColl",
      message: `${collZeroCoords.length} sondaje(s) con coordenadas Este/Norte en 0: ${collZeroCoords.map((r) => r.holeId).join(", ")}`,
    });
  }

  const collBadDepth = wb.coll.filter((r) => r.maxDepth <= 0);
  if (collBadDepth.length) {
    warnings.push({
      sheet: "DHColl",
      message: `${collBadDepth.length} sondaje(s) con Max_Depth inválido (≤ 0): ${collBadDepth.map((r) => r.holeId).join(", ")}`,
    });
  }

  // ── DHSamp ────────────────────────────────────────────────────────────────────
  if (!wb.samp.length) {
    warnings.push({ sheet: "DHSamp", message: "La hoja DHSamp no contiene filas válidas." });
  }

  const sampBadInterval = wb.samp.filter((r) => r.mTo <= r.mFrom);
  if (sampBadInterval.length) {
    const examples = sampBadInterval
      .slice(0, 3)
      .map((r) => `fila ${r.rowIndex} (${r.holeId}: ${r.mFrom}→${r.mTo})`)
      .join(", ");
    warnings.push({
      sheet: "DHSamp",
      message: `${sampBadInterval.length} fila(s) con mTo ≤ mFrom — serán omitidas. Ejemplos: ${examples}`,
    });
  }

  const sampExceedsDepth = wb.samp.filter((r) => {
    const coll = wb.coll.find((c) => c.holeId === r.holeId);
    return coll && r.mTo > coll.maxDepth + 0.01;
  });
  if (sampExceedsDepth.length) {
    warnings.push({
      sheet: "DHSamp",
      message: `${sampExceedsDepth.length} fila(s) con mTo superior al Max_Depth del sondaje — se importarán igualmente.`,
    });
  }

  // ── DHSurv ────────────────────────────────────────────────────────────────────
  const survBadAz = wb.surv.filter((r) => r.azimuth < 0 || r.azimuth > 360);
  if (survBadAz.length) {
    warnings.push({
      sheet: "DHSurv",
      message: `${survBadAz.length} fila(s) con azimuth fuera de rango [0, 360] — se importarán igualmente.`,
    });
  }

  const survBadDip = wb.surv.filter((r) => r.dip < -90 || r.dip > 90);
  if (survBadDip.length) {
    warnings.push({
      sheet: "DHSurv",
      message: `${survBadDip.length} fila(s) con dip fuera de rango [-90, 90] — se importarán igualmente.`,
    });
  }

  // ── DHLith ───────────────────────────────────────────────────────────────────
  const lithBadInterval = wb.lith.filter((r) => r.mTo <= r.mFrom);
  if (lithBadInterval.length) {
    warnings.push({
      sheet: "DHLith",
      message: `${lithBadInterval.length} fila(s) con mTo ≤ mFrom — serán omitidas.`,
    });
  }

  // ── Orphan hole IDs (in data sheets but not in DHColl) ───────────────────────
  function warnOrphans(rows: Array<{ holeId: string; rowIndex: number }>, sheet: string): void {
    const seen = new Set<string>();
    let count = 0;
    for (const r of rows) {
      if (!knownHoleIds.has(r.holeId)) {
        count++;
        seen.add(r.holeId);
      }
    }
    if (seen.size > 0) {
      warnings.push({
        sheet,
        message: `${count} fila(s) con sondajes [${[...seen].join(", ")}] ausentes en DHColl — se crearán automáticamente al importar.`,
      });
    }
  }

  warnOrphans(wb.samp, "DHSamp");
  warnOrphans(wb.surv, "DHSurv");
  warnOrphans(wb.lith, "DHLith");
  warnOrphans(wb.min, "DHMin");
  warnOrphans(wb.alt, "DHAlt");
  warnOrphans(wb.rec, "DHRec");
  warnOrphans(wb.sg, "DHSG");
  warnOrphans(wb.mag, "DHMag");
  warnOrphans(wb.struct, "DHStruct");

  // ── Summary counts ────────────────────────────────────────────────────────────
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
    valid: true,
    errors: [],
    warnings,
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
