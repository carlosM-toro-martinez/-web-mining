import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { parseWorkbook } from "./miningExcel.parser.js";
import { validateWorkbook } from "./miningExcel.validator.js";
import type { ExecuteSummary, ImportOptions, ImportWarning, ValidateResult } from "./miningExcel.types.js";

// ─── Validate only (no DB writes) ─────────────────────────────────────────────

export async function validateExcel(buffer: Buffer, opts: ImportOptions): Promise<ValidateResult> {
  const wb = parseWorkbook(buffer, opts.defaultZoneName);
  return validateWorkbook(wb);
}

// ─── Execute import ────────────────────────────────────────────────────────────

export async function executeExcel(
  buffer: Buffer,
  opts: ImportOptions,
): Promise<{ warnings: ImportWarning[]; summary: ExecuteSummary }> {
  const wb = parseWorkbook(buffer, opts.defaultZoneName);

  const summary: ExecuteSummary = {
    projectsCreated: 0,
    zonesCreated: 0,
    drillHolesCreated: 0,
    surveysCreated: 0,
    intervalsCreated: 0,
    assaysCreated: 0,
    assayValuesCreated: 0,
    lithologiesCreated: 0,
    mineralizationsCreated: 0,
    alterationsCreated: 0,
    recoveriesCreated: 0,
    densitiesCreated: 0,
    magneticSusceptibilitiesCreated: 0,
    geologicalStructuresCreated: 0,
  };

  const uid = opts.userId;
  const now = new Date();
  const executeWarnings: ImportWarning[] = [];

  // ── 1. Project (id=1) ────────────────────────────────────────────────────────
  const project = await prisma.project.findUniqueOrThrow({ where: { id: 1 } });

  // ── 2. Zones ─────────────────────────────────────────────────────────────────
  const zoneNames = [...new Set(wb.coll.map((r) => r.zoneName))];
  const zoneMap = new Map<string, number>();

  for (const zoneName of zoneNames) {
    let zone = await prisma.zone.findFirst({ where: { projectId: project.id, name: zoneName } });
    if (!zone) {
      zone = await prisma.zone.create({
        data: { projectId: project.id, name: zoneName, createdById: uid, updatedById: uid } as any,
      });
      summary.zonesCreated++;
    }
    zoneMap.set(zoneName, zone.id);
  }

  // ── 3. DrillHoles from DHColl ─────────────────────────────────────────────────
  const drillHoleMap = new Map<string, number>();

  for (const row of wb.coll) {
    const zoneId = zoneMap.get(row.zoneName)!;
    let hole = await prisma.drillHole.findFirst({ where: { projectId: project.id, name: row.holeId } });
    if (!hole) {
      hole = await prisma.drillHole.create({
        data: {
          projectId: project.id,
          zoneId,
          name: row.holeId,
          east: row.east,
          north: row.north,
          elevation: row.elevation ?? null,
          depth: row.maxDepth,
          azimuth: row.azimuth ?? null,
          dip: row.dip ?? null,
          type: row.holeType as any,
          campaign: row.campaign ?? null,
          year: row.year ?? null,
          createdById: uid,
          updatedById: uid,
          updatedAt: now,
        } as any,
      });
      summary.drillHolesCreated++;
    }
    drillHoleMap.set(row.holeId, hole.id);
  }

  // ── 3b. Auto-create orphan holes ─────────────────────────────────────────────
  const allDataHoleIds = new Set<string>([
    ...wb.surv.map((r) => r.holeId),
    ...wb.samp.map((r) => r.holeId),
    ...wb.lith.map((r) => r.holeId),
    ...wb.min.map((r) => r.holeId),
    ...wb.alt.map((r) => r.holeId),
    ...wb.rec.map((r) => r.holeId),
    ...wb.sg.map((r) => r.holeId),
    ...wb.mag.map((r) => r.holeId),
    ...wb.struct.map((r) => r.holeId),
  ]);

  const orphanIds = [...allDataHoleIds].filter((id) => !drillHoleMap.has(id));

  if (orphanIds.length > 0) {
    let defaultZoneId = zoneMap.get(opts.defaultZoneName);
    if (!defaultZoneId) {
      let defZone = await prisma.zone.findFirst({ where: { projectId: project.id, name: opts.defaultZoneName } });
      if (!defZone) {
        defZone = await prisma.zone.create({
          data: { projectId: project.id, name: opts.defaultZoneName, createdById: uid, updatedById: uid } as any,
        });
        summary.zonesCreated++;
      }
      zoneMap.set(opts.defaultZoneName, defZone.id);
      defaultZoneId = defZone.id;
    }

    type HasInterval = { holeId: string; mTo: number };
    const allIntervalRows: HasInterval[] = [
      ...wb.samp, ...wb.lith, ...wb.min, ...wb.alt,
      ...wb.rec, ...wb.sg, ...wb.mag, ...wb.struct,
    ];
    const orphanMaxDepth = new Map<string, number>();
    for (const r of allIntervalRows) {
      if (!orphanIds.includes(r.holeId)) continue;
      const cur = orphanMaxDepth.get(r.holeId) ?? 0;
      if (r.mTo > cur) orphanMaxDepth.set(r.holeId, r.mTo);
    }

    for (const holeId of orphanIds) {
      let hole = await prisma.drillHole.findFirst({ where: { projectId: project.id, name: holeId } });
      if (!hole) {
        hole = await prisma.drillHole.create({
          data: {
            projectId: project.id,
            zoneId: defaultZoneId,
            name: holeId,
            east: 0,
            north: 0,
            elevation: null,
            depth: orphanMaxDepth.get(holeId) ?? 0,
            type: "OTHER",
            createdById: uid,
            updatedById: uid,
            updatedAt: now,
          } as any,
        });
        summary.drillHolesCreated++;
      }
      drillHoleMap.set(holeId, hole.id);
    }

    executeWarnings.push({
      sheet: "DHColl",
      message: `${orphanIds.length} sondaje(s) creados automáticamente sin collar (coordenadas 0): ${orphanIds.join(", ")}`,
    });
  }

  // ── 4. Surveys ───────────────────────────────────────────────────────────────
  for (const row of wb.surv) {
    const dhId = drillHoleMap.get(row.holeId);
    if (!dhId) continue;
    const exists = await prisma.drillHoleSurvey.findFirst({
      where: { drillHoleId: dhId, depth: row.depth as any },
    });
    if (!exists) {
      await prisma.drillHoleSurvey.create({
        data: {
          drillHoleId: dhId,
          depth: row.depth,
          azimuth: row.azimuth,
          dip: row.dip,
          createdById: uid,
          updatedById: uid,
          updatedAt: now,
        } as any,
      });
      summary.surveysCreated++;
    }
  }

  // ── 5. Intervals — pre-load all existing, then bulk-create missing ────────────
  const drillHoleIds = [...drillHoleMap.values()];

  const existingIntervals = await prisma.interval.findMany({
    where: { drillHoleId: { in: drillHoleIds } },
    select: { id: true, drillHoleId: true, fromDepth: true, toDepth: true },
  });

  const intervalMap = new Map<string, number>(); // "dhId|from|to" → intervalId
  for (const iv of existingIntervals) {
    const key = `${iv.drillHoleId}|${Number(iv.fromDepth)}|${Number(iv.toDepth)}`;
    intervalMap.set(key, iv.id);
  }

  // Collect all unique intervals needed across all data sheets
  type HasMInterval = { holeId: string; mFrom: number; mTo: number };
  const allDataRows: HasMInterval[] = [
    ...wb.samp, ...wb.lith, ...wb.min, ...wb.alt,
    ...wb.rec, ...wb.sg, ...wb.mag, ...wb.struct,
  ];

  const neededIntervals = new Map<string, { drillHoleId: number; from: number; to: number }>();
  for (const row of allDataRows) {
    const dhId = drillHoleMap.get(row.holeId);
    if (!dhId) continue;
    const key = `${dhId}|${row.mFrom}|${row.mTo}`;
    if (!intervalMap.has(key) && !neededIntervals.has(key)) {
      neededIntervals.set(key, { drillHoleId: dhId, from: row.mFrom, to: row.mTo });
    }
  }

  // Create missing intervals
  for (const [key, data] of neededIntervals) {
    const interval = await prisma.interval.create({
      data: {
        drillHoleId: data.drillHoleId,
        fromDepth: data.from,
        toDepth: data.to,
        createdById: uid,
        updatedById: uid,
        updatedAt: now,
      } as any,
    });
    intervalMap.set(key, interval.id);
    summary.intervalsCreated++;
  }

  function getIntervalId(holeId: string, mFrom: number, mTo: number): number | null {
    const dhId = drillHoleMap.get(holeId);
    if (!dhId) return null;
    return intervalMap.get(`${dhId}|${mFrom}|${mTo}`) ?? null;
  }

  // ── 6. Assays + AssayValues (bulk) ────────────────────────────────────────────
  const existingAssays = await prisma.assay.findMany({
    where: { intervalId: { in: [...intervalMap.values()] } },
    select: { intervalId: true },
  });
  const assayedIntervals = new Set(existingAssays.map((a) => a.intervalId));

  const allAssayValues: any[] = [];

  for (const row of wb.samp) {
    if (row.mTo <= row.mFrom) continue;
    const intervalId = getIntervalId(row.holeId, row.mFrom, row.mTo);
    if (!intervalId || assayedIntervals.has(intervalId)) continue;

    const assay = await prisma.assay.create({
      data: {
        intervalId,
        au: row.au,
        cu: row.cu,
        ag: row.ag,
        assayMethod: "OTHER",
        createdById: uid,
        updatedById: uid,
        updatedAt: now,
      } as any,
    });
    assayedIntervals.add(intervalId);
    summary.assaysCreated++;

    for (const e of row.elements) {
      allAssayValues.push({
        assayId: assay.id,
        element: e.element,
        value: e.value,
        unit: e.unit,
        createdById: uid,
        updatedById: uid,
        updatedAt: now,
      });
    }
  }

  // One bulk insert for all assay values
  if (allAssayValues.length > 0) {
    const CHUNK = 5000;
    for (let i = 0; i < allAssayValues.length; i += CHUNK) {
      await prisma.assayValue.createMany({
        data: allAssayValues.slice(i, i + CHUNK) as any,
        skipDuplicates: true,
      });
    }
    summary.assayValuesCreated = allAssayValues.length;
  }

  // ── 7. Lithologies (bulk) ─────────────────────────────────────────────────────
  const existingLiths = await prisma.lithology.findMany({
    where: { intervalId: { in: [...intervalMap.values()] } },
    select: { intervalId: true },
  });
  const lithedIntervals = new Set(existingLiths.map((l) => l.intervalId));

  for (const row of wb.lith) {
    if (row.mTo <= row.mFrom) continue;
    const intervalId = getIntervalId(row.holeId, row.mFrom, row.mTo);
    if (!intervalId || lithedIntervals.has(intervalId)) continue;
    await prisma.lithology.create({
      data: {
        intervalId,
        rockType: row.rockType ?? null,
        code: row.code ?? null,
        color: row.color ?? null,
        grainSize: row.grainSize ?? null,
        texture: row.texture ?? null,
        weathering: row.weathering ?? null,
        comments: row.comments ?? null,
        createdById: uid,
        updatedById: uid,
        updatedAt: now,
      } as any,
    });
    lithedIntervals.add(intervalId);
    summary.lithologiesCreated++;
  }

  // ── 8. Mineralizations ────────────────────────────────────────────────────────
  const existingMins = await prisma.mineralization.findMany({
    where: { intervalId: { in: [...intervalMap.values()] } },
    select: { intervalId: true, mineral: true },
  });
  const minSet = new Set(existingMins.map((m) => `${m.intervalId}|${m.mineral}`));

  for (const row of wb.min) {
    const intervalId = getIntervalId(row.holeId, row.mFrom, row.mTo);
    if (!intervalId) continue;
    for (const m of row.mineralizations) {
      const key = `${intervalId}|${m.mineral}`;
      if (minSet.has(key)) continue;
      await prisma.mineralization.create({
        data: {
          intervalId,
          mineral: m.mineral,
          percentage: m.percentage ?? null,
          style: m.style ?? null,
          comments: row.comments ?? null,
          createdById: uid,
          updatedById: uid,
          updatedAt: now,
        } as any,
      });
      minSet.add(key);
      summary.mineralizationsCreated++;
    }
  }

  // ── 9. Alterations ────────────────────────────────────────────────────────────
  const existingAlts = await prisma.alteration.findMany({
    where: { intervalId: { in: [...intervalMap.values()] } },
    select: { intervalId: true, type: true },
  });
  const altSet = new Set(existingAlts.map((a) => `${a.intervalId}|${a.type}`));

  for (const row of wb.alt) {
    const intervalId = getIntervalId(row.holeId, row.mFrom, row.mTo);
    if (!intervalId) continue;
    for (const a of row.alterations) {
      const key = `${intervalId}|${a.type}`;
      if (altSet.has(key)) continue;
      await prisma.alteration.create({
        data: {
          intervalId,
          type: a.type,
          intensity: a.intensity ?? null,
          description: a.description ?? null,
          comments: row.comments ?? null,
          createdById: uid,
          updatedById: uid,
          updatedAt: now,
        } as any,
      });
      altSet.add(key);
      summary.alterationsCreated++;
    }
  }

  // ── 10. Recoveries ────────────────────────────────────────────────────────────
  const existingRecs = await prisma.recovery.findMany({
    where: { intervalId: { in: [...intervalMap.values()] } },
    select: { intervalId: true },
  });
  const recSet = new Set(existingRecs.map((r) => r.intervalId));

  for (const row of wb.rec) {
    const intervalId = getIntervalId(row.holeId, row.mFrom, row.mTo);
    if (!intervalId || recSet.has(intervalId)) continue;
    await prisma.recovery.create({
      data: {
        intervalId,
        recoveryPercent: row.recoveryPercent ?? null,
        rqdPercent: row.rqdPercent ?? null,
        coreLoss: row.coreLoss ?? null,
        comments: row.comments ?? null,
        createdById: uid,
        updatedById: uid,
        updatedAt: now,
      } as any,
    });
    recSet.add(intervalId);
    summary.recoveriesCreated++;
  }

  // ── 11. Densities ─────────────────────────────────────────────────────────────
  const existingDens = await prisma.density.findMany({
    where: { intervalId: { in: [...intervalMap.values()] } },
    select: { intervalId: true, method: true },
  });
  const denSet = new Set(existingDens.map((d) => `${d.intervalId}|${d.method ?? ""}`));

  for (const row of wb.sg) {
    const intervalId = getIntervalId(row.holeId, row.mFrom, row.mTo);
    if (!intervalId) continue;
    const key = `${intervalId}|${row.method ?? ""}`;
    if (denSet.has(key)) continue;
    await prisma.density.create({
      data: {
        intervalId,
        specificGravity: row.specificGravity,
        method: row.method ?? null,
        dryDensity: row.dryDensity ?? null,
        wetDensity: row.wetDensity ?? null,
        comments: row.comments ?? null,
        createdById: uid,
        updatedById: uid,
        updatedAt: now,
      } as any,
    });
    denSet.add(key);
    summary.densitiesCreated++;
  }

  // ── 12. Magnetic Susceptibilities ─────────────────────────────────────────────
  const existingMags = await prisma.magneticSusceptibility.findMany({
    where: { intervalId: { in: [...intervalMap.values()] } },
    select: { intervalId: true },
  });
  const magSet = new Set(existingMags.map((m) => m.intervalId));

  for (const row of wb.mag) {
    const intervalId = getIntervalId(row.holeId, row.mFrom, row.mTo);
    if (!intervalId || magSet.has(intervalId)) continue;
    await prisma.magneticSusceptibility.create({
      data: {
        intervalId,
        value: row.value,
        unit: row.unit ?? null,
        instrument: row.instrument ?? null,
        comments: row.comments ?? null,
        createdById: uid,
        updatedById: uid,
        updatedAt: now,
      } as any,
    });
    magSet.add(intervalId);
    summary.magneticSusceptibilitiesCreated++;
  }

  // ── 13. Geological Structures ─────────────────────────────────────────────────
  const existingStructs = await prisma.geologicalStructure.findMany({
    where: { intervalId: { in: [...intervalMap.values()] } },
    select: { intervalId: true, structureType: true },
  });
  const structSet = new Set(existingStructs.map((s) => `${s.intervalId}|${s.structureType}`));

  for (const row of wb.struct) {
    const intervalId = getIntervalId(row.holeId, row.mFrom, row.mTo);
    if (!intervalId) continue;
    const key = `${intervalId}|${row.structureType}`;
    if (structSet.has(key)) continue;
    await prisma.geologicalStructure.create({
      data: {
        intervalId,
        structureType: row.structureType,
        angle: row.angle ?? null,
        width: row.width ?? null,
        orientation: row.orientation ?? null,
        description: row.description ?? null,
        comments: row.comments ?? null,
        createdById: uid,
        updatedById: uid,
        updatedAt: now,
      } as any,
    });
    structSet.add(key);
    summary.geologicalStructuresCreated++;
  }

  logger.info({ userId: uid, project: project.id, summary }, "Mining Excel import completed");

  return { warnings: [...wb.warnings, ...executeWarnings], summary };
}
