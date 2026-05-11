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

// ─── Execute import (full transaction) ────────────────────────────────────────

export async function executeExcel(
  buffer: Buffer,
  opts: ImportOptions,
): Promise<{ warnings: ImportWarning[]; summary: ExecuteSummary }> {
  const wb = parseWorkbook(buffer, opts.defaultZoneName);
  const validation = validateWorkbook(wb);

  if (!validation.valid) {
    throw Object.assign(new Error("El Excel contiene errores y no fue importado"), {
      statusCode: 422,
      errors: validation.errors,
    });
  }

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

  await prisma.$transaction(
    async (tx) => {
      // ── 1. Project ───────────────────────────────────────────────────────────
      const project = await tx.project.upsert({
        where: { name: opts.projectName } as any,
        create: { name: opts.projectName, createdById: uid, updatedById: uid } as any,
        update: {},
      });
      if (!(project as any)._count) summary.projectsCreated = 1;

      // ── 2. Zones by name (from coll or defaultZoneName) ──────────────────────
      const zoneNames = [...new Set(wb.coll.map((r) => r.zoneName))];
      const zoneMap = new Map<string, number>();

      for (const zoneName of zoneNames) {
        let zone = await tx.zone.findFirst({
          where: { projectId: project.id, name: zoneName },
        });
        if (!zone) {
          zone = await tx.zone.create({
            data: { projectId: project.id, name: zoneName, createdById: uid, updatedById: uid } as any,
          });
          summary.zonesCreated++;
        }
        zoneMap.set(zoneName, zone.id);
      }

      // ── 3. DrillHoles ─────────────────────────────────────────────────────────
      const drillHoleMap = new Map<string, number>(); // holeId → DB id

      for (const row of wb.coll) {
        const zoneId = zoneMap.get(row.zoneName)!;

        let hole = await tx.drillHole.findFirst({
          where: { projectId: project.id, name: row.holeId },
        });

        if (!hole) {
          hole = await tx.drillHole.create({
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
            } as any,
          });
          summary.drillHolesCreated++;
        }
        drillHoleMap.set(row.holeId, hole.id);
      }

      // ── 4. DrillHoleSurveys ───────────────────────────────────────────────────
      for (const row of wb.surv) {
        const dhId = drillHoleMap.get(row.holeId);
        if (!dhId) continue;

        const exists = await tx.drillHoleSurvey.findFirst({
          where: { drillHoleId: dhId, depth: row.depth as any },
        });
        if (!exists) {
          await tx.drillHoleSurvey.create({
            data: {
              drillHoleId: dhId,
              depth: row.depth,
              azimuth: row.azimuth,
              dip: row.dip,
              createdById: uid,
              updatedById: uid,
            } as any,
          });
          summary.surveysCreated++;
        }
      }

      // ── Helper: findOrCreate Interval ─────────────────────────────────────────
      const intervalCache = new Map<string, number>(); // "holeId|from|to" → interval DB id

      async function getOrCreateInterval(
        holeId: string,
        mFrom: number,
        mTo: number,
      ): Promise<number | null> {
        const key = `${holeId}|${mFrom}|${mTo}`;
        if (intervalCache.has(key)) return intervalCache.get(key)!;

        const dhId = drillHoleMap.get(holeId);
        if (!dhId) return null;

        let interval = await tx.interval.findFirst({
          where: { drillHoleId: dhId, fromDepth: mFrom as any, toDepth: mTo as any },
        });
        if (!interval) {
          interval = await tx.interval.create({
            data: {
              drillHoleId: dhId,
              fromDepth: mFrom,
              toDepth: mTo,
              createdById: uid,
              updatedById: uid,
            } as any,
          });
          summary.intervalsCreated++;
        }
        intervalCache.set(key, interval.id);
        return interval.id;
      }

      // ── 5. DHSamp → Interval + Assay + AssayValues ───────────────────────────
      for (const row of wb.samp) {
        const intervalId = await getOrCreateInterval(row.holeId, row.mFrom, row.mTo);
        if (!intervalId) continue;

        // One assay per interval
        const existingAssay = await tx.assay.findFirst({ where: { intervalId } });
        if (!existingAssay) {
          const assay = await tx.assay.create({
            data: {
              intervalId,
              au: row.au,
              cu: row.cu,
              ag: row.ag,
              assayMethod: "OTHER",
              createdById: uid,
              updatedById: uid,
            } as any,
          });
          summary.assaysCreated++;

          if (row.elements.length > 0) {
            await tx.assayValue.createMany({
              data: row.elements.map((e) => ({
                assayId: assay.id,
                element: e.element,
                value: e.value,
                unit: e.unit,
                createdById: uid,
                updatedById: uid,
              })) as any,
              skipDuplicates: true,
            });
            summary.assayValuesCreated += row.elements.length;
          }
        }
      }

      // ── 6. DHLith → Lithology ─────────────────────────────────────────────────
      for (const row of wb.lith) {
        const intervalId = await getOrCreateInterval(row.holeId, row.mFrom, row.mTo);
        if (!intervalId) continue;

        const exists = await tx.lithology.findFirst({ where: { intervalId } });
        if (!exists) {
          await tx.lithology.create({
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
            } as any,
          });
          summary.lithologiesCreated++;
        }
      }

      // ── 7. DHMin → Mineralization ─────────────────────────────────────────────
      for (const row of wb.min) {
        const intervalId = await getOrCreateInterval(row.holeId, row.mFrom, row.mTo);
        if (!intervalId) continue;

        for (const m of row.mineralizations) {
          const exists = await tx.mineralization.findFirst({
            where: { intervalId, mineral: m.mineral },
          });
          if (!exists) {
            await tx.mineralization.create({
              data: {
                intervalId,
                mineral: m.mineral,
                percentage: m.percentage ?? null,
                style: m.style ?? null,
                comments: row.comments ?? null,
                createdById: uid,
                updatedById: uid,
              } as any,
            });
            summary.mineralizationsCreated++;
          }
        }
      }

      // ── 8. DHAlt → Alteration ─────────────────────────────────────────────────
      for (const row of wb.alt) {
        const intervalId = await getOrCreateInterval(row.holeId, row.mFrom, row.mTo);
        if (!intervalId) continue;

        for (const a of row.alterations) {
          const exists = await tx.alteration.findFirst({
            where: { intervalId, type: a.type },
          });
          if (!exists) {
            await tx.alteration.create({
              data: {
                intervalId,
                type: a.type,
                intensity: a.intensity ?? null,
                description: a.description ?? null,
                comments: row.comments ?? null,
                createdById: uid,
                updatedById: uid,
              } as any,
            });
            summary.alterationsCreated++;
          }
        }
      }

      // ── 9. DHRec → Recovery ───────────────────────────────────────────────────
      for (const row of wb.rec) {
        const intervalId = await getOrCreateInterval(row.holeId, row.mFrom, row.mTo);
        if (!intervalId) continue;

        const exists = await tx.recovery.findFirst({ where: { intervalId } });
        if (!exists) {
          await tx.recovery.create({
            data: {
              intervalId,
              recoveryPercent: row.recoveryPercent ?? null,
              rqdPercent: row.rqdPercent ?? null,
              coreLoss: row.coreLoss ?? null,
              comments: row.comments ?? null,
              createdById: uid,
              updatedById: uid,
            } as any,
          });
          summary.recoveriesCreated++;
        }
      }

      // ── 10. DHSG → Density ────────────────────────────────────────────────────
      for (const row of wb.sg) {
        const intervalId = await getOrCreateInterval(row.holeId, row.mFrom, row.mTo);
        if (!intervalId) continue;

        const exists = await tx.density.findFirst({
          where: { intervalId, method: row.method ?? null },
        });
        if (!exists) {
          await tx.density.create({
            data: {
              intervalId,
              specificGravity: row.specificGravity,
              method: row.method ?? null,
              dryDensity: row.dryDensity ?? null,
              wetDensity: row.wetDensity ?? null,
              comments: row.comments ?? null,
              createdById: uid,
              updatedById: uid,
            } as any,
          });
          summary.densitiesCreated++;
        }
      }

      // ── 11. DHMag → MagneticSusceptibility ───────────────────────────────────
      for (const row of wb.mag) {
        const intervalId = await getOrCreateInterval(row.holeId, row.mFrom, row.mTo);
        if (!intervalId) continue;

        const exists = await tx.magneticSusceptibility.findFirst({ where: { intervalId } });
        if (!exists) {
          await tx.magneticSusceptibility.create({
            data: {
              intervalId,
              value: row.value,
              unit: row.unit ?? null,
              instrument: row.instrument ?? null,
              comments: row.comments ?? null,
              createdById: uid,
              updatedById: uid,
            } as any,
          });
          summary.magneticSusceptibilitiesCreated++;
        }
      }

      // ── 12. DHStruct → GeologicalStructure ────────────────────────────────────
      for (const row of wb.struct) {
        const intervalId = await getOrCreateInterval(row.holeId, row.mFrom, row.mTo);
        if (!intervalId) continue;

        const exists = await tx.geologicalStructure.findFirst({
          where: { intervalId, structureType: row.structureType },
        });
        if (!exists) {
          await tx.geologicalStructure.create({
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
            } as any,
          });
          summary.geologicalStructuresCreated++;
        }
      }

      logger.info({ userId: uid, project: opts.projectName, summary }, "Mining Excel import completed");
    },
    { timeout: 180_000 },
  );

  return { warnings: wb.warnings, summary };
}
