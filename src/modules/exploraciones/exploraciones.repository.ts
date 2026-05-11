import { prisma } from "../../config/prisma.js";

export const exploracionesRepository = {
  async createSamplePoint(data: {
    miningLaborId: string;
    east?: number | null;
    north?: number | null;
    elevation?: number | null;
    reference?: string | null;
    station?: string | null;
  }) {
    return prisma.samplePoint.create({ data });
  },

  async createSample(data: {
    code: string;
    sampleType: "CHANNEL" | "CHIP" | "GRAB" | "CORE" | "SOIL" | "ROCK" | "OTHER";
    sampleNumber?: number | null;
    laboratory1?: string | null;
    laboratory2?: string | null;
    laboratory3?: string | null;
    sector?: string | null;
    collectedAt?: Date | null;
    deliveredAt?: Date | null;
    description?: string | null;
    userId?: number | null;
    samplePointId: string;
  }) {
    return prisma.sample.create({ data });
  },

  async findElementByName(name: string) {
    return prisma.element.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  },

  async createElement(data: {
    name: string;
    symbol?: string | null;
    unit?: string | null;
    description?: string | null;
  }) {
    return prisma.element.create({ data });
  },

  async upsertResult(
    sampleId: string,
    elementId: string,
    value: number,
    qualifier?: string | null,
  ) {
    return prisma.sampleResult.upsert({
      where: { sampleId_elementId: { sampleId, elementId } },
      update: { value, qualifier: qualifier ?? null },
      create: { sampleId, elementId, value, qualifier: qualifier ?? null },
    });
  },

  async updateSamplePoint(
    id: string,
    data: {
      miningLaborId?: string;
      east?: number | null;
      north?: number | null;
      elevation?: number | null;
      reference?: string | null;
      station?: string | null;
    },
  ) {
    return prisma.samplePoint.update({ where: { id }, data });
  },

  async updateSample(
    id: string,
    data: {
      code?: string;
      sampleType?: "CHANNEL" | "CHIP" | "GRAB" | "CORE" | "SOIL" | "ROCK" | "OTHER";
      sampleNumber?: number | null;
      laboratory1?: string | null;
      laboratory2?: string | null;
      laboratory3?: string | null;
      sector?: string | null;
      collectedAt?: Date | null;
      deliveredAt?: Date | null;
      description?: string | null;
    },
  ) {
    return prisma.sample.update({ where: { id }, data });
  },

  async deleteResultsBySampleId(sampleId: string) {
    return prisma.sampleResult.deleteMany({ where: { sampleId } });
  },

  async getLaboratorios() {
    const labs1 = await prisma.sample.findMany({
      where: { laboratory1: { not: null } },
      select: { laboratory1: true },
      distinct: ["laboratory1"],
    });
    const labs2 = await prisma.sample.findMany({
      where: { laboratory2: { not: null } },
      select: { laboratory2: true },
      distinct: ["laboratory2"],
    });
    const labs3 = await prisma.sample.findMany({
      where: { laboratory3: { not: null } },
      select: { laboratory3: true },
      distinct: ["laboratory3"],
    });

    const uniqueLabs = new Set<string>();
    labs1.forEach((l) => l.laboratory1 && uniqueLabs.add(l.laboratory1));
    labs2.forEach((l) => l.laboratory2 && uniqueLabs.add(l.laboratory2));
    labs3.forEach((l) => l.laboratory3 && uniqueLabs.add(l.laboratory3));

    return Array.from(uniqueLabs).sort();
  },

  async getElementos() {
    return prisma.element.findMany({ orderBy: { name: "asc" } });
  },

  async getMuestras(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [muestras, total] = await Promise.all([
      prisma.sample.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          samplePoint: true,
          results: { include: { element: true } },
        },
      }),
      prisma.sample.count(),
    ]);

    return { muestras, total };
  },

  async getMuestraById(id: string) {
    return prisma.sample.findUnique({
      where: { id },
      include: {
        samplePoint: true,
        results: { include: { element: true } },
      },
    });
  },

  async getAllUbicaciones() {
    return prisma.samplePoint.findMany({ orderBy: { createdAt: "desc" } });
  },

  async getAllMuestras() {
    return prisma.sample.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        samplePoint: true,
        results: { include: { element: true } },
        user: true,
      },
    });
  },

  async getAllResultados() {
    return prisma.sampleResult.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sample: true,
        element: true,
      },
    });
  },
};
