import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  CreateElementDTO,
  CreateLaboratoryDTO,
  CreateMiningAreaDTO,
  CreateMiningLaborDTO,
  CreateMiningLevelDTO,
  CreateSampleDTO,
  CreateSampleLabWithLaboratoryDTO,
  CreateSampleLaboratoryDTO,
  CreateSampleQAQCDTO,
  CreateSampleResultDTO,
  CreateSampleWithResultsDTO,
  ElementQuery,
  LaboratoryQuery,
  MiningAreaQuery,
  MiningLaborQuery,
  MiningLevelQuery,
  SampleLaboratoryQuery,
  SampleQAQCQuery,
  SampleQuery,
  SampleResultQuery,
  UpdateElementDTO,
  UpdateLaboratoryDTO,
  UpdateMiningAreaDTO,
  UpdateMiningLaborDTO,
  UpdateMiningLevelDTO,
  UpdateSampleDTO,
  UpdateSampleLaboratoryDTO,
  UpdateSampleQAQCDTO,
  UpdateSampleResultDTO,
} from "./surfaceExploration.types.js";

const pg = (q: any) => {
  const p = Number(q.page ?? 1);
  const l = Number(q.limit ?? 20);
  return { p, l, skip: (p - 1) * l };
};

const toDate = (s?: string | null) => (s ? new Date(s) : null);

export const surfaceExplorationService = {
  // ─── MiningArea ─────────────────────────────────────────────────────────────
  async getMiningAreas(query: MiningAreaQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.search) where.name = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.miningArea.findMany({
        where,
        skip,
        take: l,
        orderBy: { name: "asc" },
        include: { levels: { select: { id: true, name: true } } },
      }),
      prisma.miningArea.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getMiningAreaById(id: string) {
    const area = await prisma.miningArea.findUnique({
      where: { id },
      include: {
        levels: {
          include: { labors: { select: { id: true, name: true, code: true } } },
        },
      },
    });
    if (!area) throw new HttpError("Mining area not found", 404);
    return area;
  },

  async createMiningArea(data: CreateMiningAreaDTO, userId?: number) {
    const area = await prisma.miningArea.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ areaId: area.id, userId }, "MiningArea created");
    return area;
  },

  async updateMiningArea(id: string, data: UpdateMiningAreaDTO, userId?: number) {
    await this.getMiningAreaById(id);
    const updated = await prisma.miningArea.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ areaId: id, userId }, "MiningArea updated");
    return updated;
  },

  async deleteMiningArea(id: string) {
    await this.getMiningAreaById(id);
    return prisma.miningArea.delete({ where: { id } });
  },

  // ─── MiningLevel ────────────────────────────────────────────────────────────
  async getMiningLevels(query: MiningLevelQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.miningAreaId) where.miningAreaId = query.miningAreaId;
    if (query.search) where.name = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.miningLevel.findMany({
        where,
        skip,
        take: l,
        orderBy: { name: "asc" },
        include: { miningArea: { select: { id: true, name: true } } },
      }),
      prisma.miningLevel.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getMiningLevelById(id: string) {
    const level = await prisma.miningLevel.findUnique({
      where: { id },
      include: {
        miningArea: { select: { id: true, name: true } },
        labors: { select: { id: true, name: true, code: true } },
      },
    });
    if (!level) throw new HttpError("Mining level not found", 404);
    return level;
  },

  async createMiningLevel(data: CreateMiningLevelDTO, userId?: number) {
    const area = await prisma.miningArea.findUnique({ where: { id: data.miningAreaId } });
    if (!area) throw new HttpError("Mining area not found", 404);
    const level = await prisma.miningLevel.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ levelId: level.id, userId }, "MiningLevel created");
    return level;
  },

  async updateMiningLevel(id: string, data: UpdateMiningLevelDTO, userId?: number) {
    await this.getMiningLevelById(id);
    if (data.miningAreaId) {
      const area = await prisma.miningArea.findUnique({ where: { id: data.miningAreaId } });
      if (!area) throw new HttpError("Mining area not found", 404);
    }
    const updated = await prisma.miningLevel.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ levelId: id, userId }, "MiningLevel updated");
    return updated;
  },

  async deleteMiningLevel(id: string) {
    await this.getMiningLevelById(id);
    return prisma.miningLevel.delete({ where: { id } });
  },

  // ─── MiningLabor ────────────────────────────────────────────────────────────
  async getMiningLabors(query: MiningLaborQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.miningLevelId) where.miningLevelId = query.miningLevelId;
    if (query.search) where.name = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.miningLabor.findMany({
        where,
        skip,
        take: l,
        orderBy: { name: "asc" },
        include: { miningLevel: { select: { id: true, name: true } } },
      }),
      prisma.miningLabor.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getMiningLaborById(id: string) {
    const labor = await prisma.miningLabor.findUnique({
      where: { id },
      include: {
        miningLevel: { include: { miningArea: { select: { id: true, name: true } } } },
        samples: { select: { id: true, code: true, sampleType: true } },
      },
    });
    if (!labor) throw new HttpError("Mining labor not found", 404);
    return labor;
  },

  async createMiningLabor(data: CreateMiningLaborDTO, userId?: number) {
    const level = await prisma.miningLevel.findUnique({ where: { id: data.miningLevelId } });
    if (!level) throw new HttpError("Mining level not found", 404);
    const labor = await prisma.miningLabor.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ laborId: labor.id, userId }, "MiningLabor created");
    return labor;
  },

  async updateMiningLabor(id: string, data: UpdateMiningLaborDTO, userId?: number) {
    await this.getMiningLaborById(id);
    if (data.miningLevelId) {
      const level = await prisma.miningLevel.findUnique({ where: { id: data.miningLevelId } });
      if (!level) throw new HttpError("Mining level not found", 404);
    }
    const updated = await prisma.miningLabor.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ laborId: id, userId }, "MiningLabor updated");
    return updated;
  },

  async deleteMiningLabor(id: string) {
    await this.getMiningLaborById(id);
    return prisma.miningLabor.delete({ where: { id } });
  },

  // ─── Sample ─────────────────────────────────────────────────────────────────
  async getSamples(query: SampleQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.miningLaborId) where.miningLaborId = query.miningLaborId;
    if (query.sampleType) where.sampleType = query.sampleType;
    if (query.search) where.code = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.sample.findMany({
        where,
        skip,
        take: l,
        orderBy: { code: "asc" },
        include: {
          miningLabor: { select: { id: true, name: true, code: true } },
          sampleLabs: {
            include: {
              laboratory: { select: { id: true, name: true, abbreviation: true } },
              results: { include: { element: true } },
            },
          },
          results: {
            include: { element: true, sampleLaboratory: { select: { id: true, slot: true } } },
          },
          qaqcRecords: true,
          _count: { select: { sampleLabs: true, results: true, qaqcRecords: true } },
        },
      }),
      prisma.sample.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSampleById(id: string) {
    const sample = await prisma.sample.findUnique({
      where: { id },
      include: {
        miningLabor: {
          include: {
            miningLevel: { include: { miningArea: { select: { id: true, name: true } } } },
          },
        },
        sampleLabs: {
          include: {
            laboratory: { select: { id: true, name: true, abbreviation: true } },
            results: { include: { element: true } },
          },
        },
        results: {
          include: { element: true, sampleLaboratory: { select: { id: true, slot: true } } },
        },
        qaqcRecords: true,
      },
    });
    if (!sample) throw new HttpError("Sample not found", 404);
    return sample;
  },

  async createSample(data: CreateSampleDTO, userId?: number) {
    const labor = await prisma.miningLabor.findUnique({ where: { id: data.miningLaborId } });
    if (!labor) throw new HttpError("Mining labor not found", 404);
    const existing = await prisma.sample.findUnique({ where: { code: data.code } });
    if (existing) throw new HttpError(`Sample code '${data.code}' already exists`, 409);
    const sample = await prisma.sample.create({
      data: {
        ...data,
        sampledAt: toDate(data.sampledAt),
        createdById: userId,
        updatedById: userId,
      } as any,
    });
    logger.info({ sampleId: sample.id, userId }, "Sample created");
    return sample;
  },

  async updateSample(id: string, data: UpdateSampleDTO, userId?: number) {
    await this.getSampleById(id);
    if (data.miningLaborId) {
      const labor = await prisma.miningLabor.findUnique({ where: { id: data.miningLaborId } });
      if (!labor) throw new HttpError("Mining labor not found", 404);
    }
    if (data.code) {
      const existing = await prisma.sample.findUnique({ where: { code: data.code } });
      if (existing && existing.id !== id)
        throw new HttpError(`Sample code '${data.code}' already exists`, 409);
    }
    const updated = await prisma.sample.update({
      where: { id },
      data: {
        ...data,
        sampledAt: data.sampledAt !== undefined ? toDate(data.sampledAt) : undefined,
        updatedById: userId,
      } as any,
    });
    logger.info({ sampleId: id, userId }, "Sample updated");
    return updated;
  },

  async deleteSample(id: string) {
    await this.getSampleById(id);
    return prisma.sample.delete({ where: { id } });
  },

  // ─── Laboratory ─────────────────────────────────────────────────────────────
  async getLaboratories(query: LaboratoryQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.search) where.name = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.laboratory.findMany({ where, skip, take: l, orderBy: { name: "asc" } }),
      prisma.laboratory.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getLaboratoryById(id: string) {
    const lab = await prisma.laboratory.findUnique({ where: { id } });
    if (!lab) throw new HttpError("Laboratory not found", 404);
    return lab;
  },

  async createLaboratory(data: CreateLaboratoryDTO, userId?: number) {
    const existing = await prisma.laboratory.findUnique({ where: { name: data.name } });
    if (existing) throw new HttpError(`Laboratory '${data.name}' already exists`, 409);
    const lab = await prisma.laboratory.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ labId: lab.id, userId }, "Laboratory created");
    return lab;
  },

  async updateLaboratory(id: string, data: UpdateLaboratoryDTO, userId?: number) {
    await this.getLaboratoryById(id);
    if (data.name) {
      const existing = await prisma.laboratory.findUnique({ where: { name: data.name } });
      if (existing && existing.id !== id)
        throw new HttpError(`Laboratory '${data.name}' already exists`, 409);
    }
    const updated = await prisma.laboratory.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ labId: id, userId }, "Laboratory updated");
    return updated;
  },

  async deleteLaboratory(id: string) {
    await this.getLaboratoryById(id);
    return prisma.laboratory.delete({ where: { id } });
  },

  // ─── SampleLaboratory ───────────────────────────────────────────────────────
  async getSampleLaboratories(query: SampleLaboratoryQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.sampleId) where.sampleId = query.sampleId;
    if (query.laboratoryId) where.laboratoryId = query.laboratoryId;
    if (query.slot) where.slot = query.slot;
    const [data, total] = await Promise.all([
      prisma.sampleLaboratory.findMany({
        where,
        skip,
        take: l,
        orderBy: { slot: "asc" },
        include: {
          sample: { select: { id: true, code: true } },
          laboratory: { select: { id: true, name: true, abbreviation: true } },
          _count: { select: { results: true } },
        },
      }),
      prisma.sampleLaboratory.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSampleLaboratoryById(id: string) {
    const sl = await prisma.sampleLaboratory.findUnique({
      where: { id },
      include: {
        sample: { select: { id: true, code: true, sampleType: true } },
        laboratory: true,
        results: { include: { element: true } },
      },
    });
    if (!sl) throw new HttpError("SampleLaboratory not found", 404);
    return sl;
  },

  async createSampleLaboratory(data: CreateSampleLaboratoryDTO, userId?: number) {
    const [sample, lab] = await Promise.all([
      prisma.sample.findUnique({ where: { id: data.sampleId } }),
      prisma.laboratory.findUnique({ where: { id: data.laboratoryId } }),
    ]);
    if (!sample) throw new HttpError("Sample not found", 404);
    if (!lab) throw new HttpError("Laboratory not found", 404);
    const existing = await prisma.sampleLaboratory.findUnique({
      where: { sampleId_slot: { sampleId: data.sampleId, slot: data.slot } },
    });
    if (existing) throw new HttpError(`Sample already has a laboratory in slot ${data.slot}`, 409);
    const sl = await prisma.sampleLaboratory.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ slId: sl.id, userId }, "SampleLaboratory created");
    return sl;
  },

  async updateSampleLaboratory(id: string, data: UpdateSampleLaboratoryDTO, userId?: number) {
    const current = await this.getSampleLaboratoryById(id);
    if (data.sampleId) {
      const sample = await prisma.sample.findUnique({ where: { id: data.sampleId } });
      if (!sample) throw new HttpError("Sample not found", 404);
    }
    if (data.laboratoryId) {
      const lab = await prisma.laboratory.findUnique({ where: { id: data.laboratoryId } });
      if (!lab) throw new HttpError("Laboratory not found", 404);
    }
    if (data.slot || data.sampleId) {
      const sampleId = data.sampleId ?? current.sampleId;
      const slot = data.slot ?? current.slot;
      const clash = await prisma.sampleLaboratory.findUnique({
        where: { sampleId_slot: { sampleId, slot } },
      });
      if (clash && clash.id !== id)
        throw new HttpError(`Slot ${slot} already used for this sample`, 409);
    }
    const updated = await prisma.sampleLaboratory.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ slId: id, userId }, "SampleLaboratory updated");
    return updated;
  },

  async deleteSampleLaboratory(id: string) {
    await this.getSampleLaboratoryById(id);
    return prisma.sampleLaboratory.delete({ where: { id } });
  },

  // ─── Element ────────────────────────────────────────────────────────────────
  async getElements(query: ElementQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.symbol) where.symbol = { contains: query.symbol, mode: "insensitive" as const };
    if (query.search)
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" as const } },
        { symbol: { contains: query.search, mode: "insensitive" as const } },
      ];
    const [data, total] = await Promise.all([
      prisma.element.findMany({ where, skip, take: l, orderBy: { symbol: "asc" } }),
      prisma.element.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getElementById(id: string) {
    const el = await prisma.element.findUnique({ where: { id } });
    if (!el) throw new HttpError("Element not found", 404);
    return el;
  },

  async createElement(data: CreateElementDTO, userId?: number) {
    const el = await prisma.element.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ elementId: el.id, userId }, "Element created");
    return el;
  },

  async updateElement(id: string, data: UpdateElementDTO, userId?: number) {
    await this.getElementById(id);
    const updated = await prisma.element.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ elementId: id, userId }, "Element updated");
    return updated;
  },

  async deleteElement(id: string) {
    await this.getElementById(id);
    return prisma.element.delete({ where: { id } });
  },

  // ─── SampleResult ───────────────────────────────────────────────────────────
  async getSampleResults(query: SampleResultQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.sampleId) where.sampleId = query.sampleId;
    if (query.sampleLaboratoryId) where.sampleLaboratoryId = query.sampleLaboratoryId;
    if (query.elementId) where.elementId = query.elementId;
    const [data, total] = await Promise.all([
      prisma.sampleResult.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: "desc" },
        include: {
          element: { select: { id: true, name: true, symbol: true, defaultUnit: true } },
          sampleLaboratory: {
            select: { id: true, slot: true, laboratory: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.sampleResult.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSampleResultById(id: string) {
    const result = await prisma.sampleResult.findUnique({
      where: { id },
      include: {
        element: true,
        sample: { select: { id: true, code: true } },
        sampleLaboratory: { include: { laboratory: true } },
      },
    });
    if (!result) throw new HttpError("Sample result not found", 404);
    return result;
  },

  async createSampleResult(data: CreateSampleResultDTO, userId?: number) {
    const [sample, element] = await Promise.all([
      prisma.sample.findUnique({ where: { id: data.sampleId } }),
      prisma.element.findUnique({ where: { id: data.elementId } }),
    ]);
    if (!sample) throw new HttpError("Sample not found", 404);
    if (!element) throw new HttpError("Element not found", 404);
    if (data.sampleLaboratoryId) {
      const sl = await prisma.sampleLaboratory.findUnique({
        where: { id: data.sampleLaboratoryId },
      });
      if (!sl) throw new HttpError("SampleLaboratory not found", 404);
    }
    const result = await prisma.sampleResult.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ resultId: result.id, userId }, "SampleResult created");
    return result;
  },

  async updateSampleResult(id: string, data: UpdateSampleResultDTO, userId?: number) {
    await this.getSampleResultById(id);
    if (data.elementId) {
      const el = await prisma.element.findUnique({ where: { id: data.elementId } });
      if (!el) throw new HttpError("Element not found", 404);
    }
    const updated = await prisma.sampleResult.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ resultId: id, userId }, "SampleResult updated");
    return updated;
  },

  async deleteSampleResult(id: string) {
    await this.getSampleResultById(id);
    return prisma.sampleResult.delete({ where: { id } });
  },

  // ─── SampleQAQC ─────────────────────────────────────────────────────────────
  async getSampleQAQCs(query: SampleQAQCQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.sampleId) where.sampleId = query.sampleId;
    if (query.type) where.type = query.type;
    if (query.passed !== undefined) where.passed = query.passed;
    const [data, total] = await Promise.all([
      prisma.sampleQAQC.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: "desc" },
        include: { sample: { select: { id: true, code: true, sampleType: true } } },
      }),
      prisma.sampleQAQC.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async getSampleQAQCById(id: string) {
    const qaqc = await prisma.sampleQAQC.findUnique({
      where: { id },
      include: { sample: { select: { id: true, code: true } } },
    });
    if (!qaqc) throw new HttpError("QAQC record not found", 404);
    return qaqc;
  },

  async createSampleQAQC(data: CreateSampleQAQCDTO, userId?: number) {
    const sample = await prisma.sample.findUnique({ where: { id: data.sampleId } });
    if (!sample) throw new HttpError("Sample not found", 404);
    const qaqc = await prisma.sampleQAQC.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });
    logger.info({ qaqcId: qaqc.id, userId }, "SampleQAQC created");
    return qaqc;
  },

  async updateSampleQAQC(id: string, data: UpdateSampleQAQCDTO, userId?: number) {
    await this.getSampleQAQCById(id);
    if (data.sampleId) {
      const sample = await prisma.sample.findUnique({ where: { id: data.sampleId } });
      if (!sample) throw new HttpError("Sample not found", 404);
    }
    const updated = await prisma.sampleQAQC.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });
    logger.info({ qaqcId: id, userId }, "SampleQAQC updated");
    return updated;
  },

  async deleteSampleQAQC(id: string) {
    await this.getSampleQAQCById(id);
    return prisma.sampleQAQC.delete({ where: { id } });
  },

  // ─── Sample with Results (transaction) ──────────────────────────────────────
  async getSamplesWithResults(query: SampleQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.miningLaborId) where.miningLaborId = query.miningLaborId;
    if (query.sampleType) where.sampleType = query.sampleType;
    if (query.search) where.code = { contains: query.search, mode: "insensitive" as const };
    const [data, total] = await Promise.all([
      prisma.sample.findMany({
        where,
        skip,
        take: l,
        orderBy: { code: "asc" },
        include: {
          miningLabor: { select: { id: true, name: true, code: true } },
          sampleLabs: {
            include: { laboratory: { select: { id: true, name: true, abbreviation: true } } },
            orderBy: { slot: "asc" },
          },
          results: {
            include: {
              element: { select: { id: true, name: true, symbol: true, defaultUnit: true } },
              sampleLaboratory: { select: { id: true, slot: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          qaqcRecords: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.sample.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async createSampleWithResults(data: CreateSampleWithResultsDTO, userId?: number) {
    const labor = await prisma.miningLabor.findUnique({ where: { id: data.miningLaborId } });
    if (!labor) throw new HttpError("Mining labor not found", 404);
    const existing = await prisma.sample.findUnique({ where: { code: data.code } });
    if (existing) throw new HttpError(`Sample code '${data.code}' already exists`, 409);

    const { results: resultsData, qaqcRecords: qaqcData, sampleLabs: sampleLabsData, ...sampleFields } = data;

    if (resultsData.length > 0) {
      const elementIds = [...new Set(resultsData.map((r) => r.elementId))];
      const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });
      if (elements.length !== elementIds.length)
        throw new HttpError("One or more elements not found", 404);

      const existingSlIds = resultsData.flatMap((r) =>
        r.sampleLaboratoryId ? [r.sampleLaboratoryId] : [],
      );
      if (existingSlIds.length > 0) {
        const sls = await prisma.sampleLaboratory.findMany({ where: { id: { in: existingSlIds } } });
        if (sls.length !== new Set(existingSlIds).size)
          throw new HttpError("One or more sample laboratories not found", 404);
      }
    }

    const existingLabIds = sampleLabsData.flatMap((sl) =>
      sl.laboratoryId ? [sl.laboratoryId] : [],
    );
    if (existingLabIds.length > 0) {
      const labs = await prisma.laboratory.findMany({ where: { id: { in: existingLabIds } } });
      if (labs.length !== new Set(existingLabIds).size)
        throw new HttpError("One or more laboratories not found", 404);
    }

    return prisma.$transaction(async (tx) => {
      const sample = await tx.sample.create({
        data: {
          ...sampleFields,
          sampledAt: toDate(sampleFields.sampledAt),
          createdById: userId,
          updatedById: userId,
        } as any,
      });

      // Create SampleLaboratory records and build slot→id map for result linking
      const slotToSampleLabId = new Map<string, string>();
      for (const slData of sampleLabsData) {
        let laboratoryId = slData.laboratoryId;
        if (!laboratoryId && slData.laboratory) {
          const lab = await tx.laboratory.upsert({
            where: { name: slData.laboratory.name },
            create: { ...slData.laboratory, createdById: userId, updatedById: userId } as any,
            update: {},
          });
          laboratoryId = lab.id;
        }
        const sampleLab = await tx.sampleLaboratory.create({
          data: {
            sampleId: sample.id,
            laboratoryId: laboratoryId!,
            slot: slData.slot,
            createdById: userId,
            updatedById: userId,
          } as any,
        });
        slotToSampleLabId.set(slData.slot, sampleLab.id);
      }

      if (resultsData.length > 0) {
        await tx.sampleResult.createMany({
          data: resultsData.map((r) => {
            const { slot, ...rest } = r;
            const resolvedLabId = rest.sampleLaboratoryId ?? (slot ? slotToSampleLabId.get(slot) : undefined);
            return {
              ...rest,
              sampleId: sample.id,
              sampleLaboratoryId: resolvedLabId,
              createdById: userId,
              updatedById: userId,
            };
          }) as any,
        });
      }

      if (qaqcData.length > 0) {
        await tx.sampleQAQC.createMany({
          data: qaqcData.map((q) => ({
            ...q,
            sampleId: sample.id,
            createdById: userId,
            updatedById: userId,
          })) as any,
        });
      }

      logger.info(
        { sampleId: sample.id, resultCount: resultsData.length, qaqcCount: qaqcData.length, sampleLabCount: sampleLabsData.length, userId },
        "Sample with results, QAQC, and labs created",
      );

      return tx.sample.findUnique({
        where: { id: sample.id },
        include: {
          miningLabor: { select: { id: true, name: true, code: true } },
          sampleLabs: {
            include: { laboratory: { select: { id: true, name: true, abbreviation: true } } },
          },
          results: {
            include: { element: true, sampleLaboratory: { select: { id: true, slot: true } } },
          },
          qaqcRecords: true,
        },
      });
    });
  },

  // ─── SampleLaboratory with Laboratory (transaction) ──────────────────────────
  async getSampleLabsWithLaboratory(query: SampleLaboratoryQuery) {
    const { p, l, skip } = pg(query);
    const where: any = {};
    if (query.sampleId) where.sampleId = query.sampleId;
    if (query.laboratoryId) where.laboratoryId = query.laboratoryId;
    if (query.slot) where.slot = query.slot;
    const [data, total] = await Promise.all([
      prisma.sampleLaboratory.findMany({
        where,
        skip,
        take: l,
        orderBy: { slot: "asc" },
        include: {
          sample: { select: { id: true, code: true, sampleType: true } },
          laboratory: true,
          results: {
            include: {
              element: { select: { id: true, name: true, symbol: true, defaultUnit: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.sampleLaboratory.count({ where }),
    ]);
    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  },

  async createSampleLabWithLaboratory(data: CreateSampleLabWithLaboratoryDTO, userId?: number) {
    const sample = await prisma.sample.findUnique({ where: { id: data.sampleId } });
    if (!sample) throw new HttpError("Sample not found", 404);

    const slotTaken = await prisma.sampleLaboratory.findUnique({
      where: { sampleId_slot: { sampleId: data.sampleId, slot: data.slot } },
    });
    if (slotTaken) throw new HttpError(`Sample already has a laboratory in slot ${data.slot}`, 409);

    return prisma.$transaction(async (tx) => {
      let laboratoryId = data.laboratoryId;

      if (!laboratoryId) {
        const lab = data.laboratory!;
        const nameConflict = await tx.laboratory.findUnique({ where: { name: lab.name } });
        if (nameConflict) throw new HttpError(`Laboratory '${lab.name}' already exists`, 409);
        const created = await tx.laboratory.create({
          data: { ...lab, createdById: userId, updatedById: userId } as any,
        });
        laboratoryId = created.id;
      } else {
        const lab = await tx.laboratory.findUnique({ where: { id: laboratoryId } });
        if (!lab) throw new HttpError("Laboratory not found", 404);
      }

      const sl = await tx.sampleLaboratory.create({
        data: {
          sampleId: data.sampleId,
          slot: data.slot,
          laboratoryId,
          createdById: userId,
          updatedById: userId,
        } as any,
      });

      logger.info(
        { slId: sl.id, laboratoryId, userId },
        "SampleLaboratory with laboratory created",
      );

      return tx.sampleLaboratory.findUnique({
        where: { id: sl.id },
        include: {
          sample: { select: { id: true, code: true, sampleType: true } },
          laboratory: true,
          results: { include: { element: true } },
        },
      });
    });
  },
};
