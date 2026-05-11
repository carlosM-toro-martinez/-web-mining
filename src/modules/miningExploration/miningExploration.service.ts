import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  AlterationQuery,
  AssayQuery,
  AssayValueQuery,
  CreateAlterationDTO,
  CreateAssayDTO,
  CreateAssayValueDTO,
  CreateDensityDTO,
  CreateDrillHoleDTO,
  CreateDrillHoleSurveyDTO,
  CreateGeologicalStructureDTO,
  CreateIntervalDTO,
  CreateLithologyDTO,
  CreateMagneticSusceptibilityDTO,
  CreateMineralizationDTO,
  CreateProjectDTO,
  CreateQAQCDTO,
  CreateRecoveryDTO,
  CreateResourceDTO,
  CreateSignificantInterceptDTO,
  CreateZoneDTO,
  DensityQuery,
  DrillHoleQuery,
  DrillHoleSurveyQuery,
  GeologicalStructureQuery,
  IntervalQuery,
  LithologyQuery,
  MagneticSusceptibilityQuery,
  MineralizationQuery,
  ProjectQuery,
  QAQCQuery,
  RecoveryQuery,
  ResourceQuery,
  SignificantInterceptQuery,
  UpdateAlterationDTO,
  UpdateAssayDTO,
  UpdateAssayValueDTO,
  UpdateDensityDTO,
  UpdateDrillHoleDTO,
  UpdateDrillHoleSurveyDTO,
  UpdateGeologicalStructureDTO,
  UpdateIntervalDTO,
  UpdateLithologyDTO,
  UpdateMagneticSusceptibilityDTO,
  UpdateMineralizationDTO,
  UpdateProjectDTO,
  UpdateQAQCDTO,
  UpdateRecoveryDTO,
  UpdateResourceDTO,
  UpdateSignificantInterceptDTO,
  UpdateZoneDTO,
  ZoneQuery,
} from "./miningExploration.types.js";

const safeLog = (accion: string, data: object, usuarioId?: number) => {
  prisma.log
    .create({ data: { accion, data, usuarioId: usuarioId ?? null } })
    .catch((err) => logger.warn({ err, accion }, "Log creation failed"));
};

const getPagination = (query: any) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const miningExplorationService = {
  async getProjects(query: ProjectQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: "insensitive" as const } },
        { description: { contains: String(query.search), mode: "insensitive" as const } },
        { location: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          zones: {
            select: {
              id: true,
              name: true,
            },
          },
          resources: {
            select: {
              id: true,
              type: true,
              category: true,
              tonnes: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      projects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getProjectById(id: number) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        zones: {
          select: {
            id: true,
            name: true,
          },
        },
        drillHoles: {
          select: {
            id: true,
            name: true,
            east: true,
            north: true,
          },
          take: 50,
        },
        resources: true,
      },
    });
  },

  async createProject(data: CreateProjectDTO, userId: number) {
    const project = await prisma.project.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_PROJECT", { projectId: project.id, ...data }, userId);

    logger.info({ userId, projectId: project.id, action: "CREATE_PROJECT" }, "Project created");
    return project;
  },

  async updateProject(id: number, data: UpdateProjectDTO, userId: number) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new HttpError("Project not found", 404);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("UPDATE_PROJECT", { projectId: id, changes: data }, userId);

    logger.info({ userId, projectId: id, action: "UPDATE_PROJECT" }, "Project updated");
    return updated;
  },

  async deleteProject(id: number) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new HttpError("Project not found", 404);
    return prisma.project.delete({ where: { id } });
  },

  async getZones(query: ZoneQuery) {
    const { page, limit, skip } = getPagination(query);
    return prisma.zone.findMany({
      where: { projectId: query.projectId },
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async getZoneById(id: number) {
    return prisma.zone.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        drillHoles: {
          select: {
            id: true,
            name: true,
            east: true,
            north: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });
  },

  async createZone(data: CreateZoneDTO, userId: number) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) {
      throw new HttpError("Project not found", 404);
    }

    const zone = await prisma.zone.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_ZONE", { zoneId: zone.id, ...data }, userId);

    logger.info({ userId, zoneId: zone.id, action: "CREATE_ZONE" }, "Zone created");
    return zone;
  },

  async updateZone(id: number, data: UpdateZoneDTO, userId: number) {
    const zone = await prisma.zone.findUnique({ where: { id } });
    if (!zone) {
      throw new HttpError("Zone not found", 404);
    }

    if (data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: data.projectId } });
      if (!project) {
        throw new HttpError("Project not found", 404);
      }
    }

    const updated = await prisma.zone.update({
      where: { id },
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("UPDATE_ZONE", { zoneId: id, changes: data }, userId);

    logger.info({ userId, zoneId: id, action: "UPDATE_ZONE" }, "Zone updated");
    return updated;
  },

  async deleteZone(id: number) {
    const zone = await prisma.zone.findUnique({ where: { id } });
    if (!zone) throw new HttpError("Zone not found", 404);
    return prisma.zone.delete({ where: { id } });
  },

  async getDrillHoles(query: DrillHoleQuery) {
    const { page, limit, skip } = getPagination(query);
    return prisma.drillHole.findMany({
      where: { zoneId: query.zoneId },
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        intervals: {
          orderBy: { fromDepth: "asc" },
          include: {
            assays: {
              select: {
                id: true,
                au: true,
                cu: true,
                ag: true,
              },
            },
            lithologies: true,
          },
        },
      },
    });
  },

  async getDrillHoleById(id: number) {
    return prisma.drillHole.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        intervals: {
          orderBy: { fromDepth: "asc" },
          include: {
            assays: {
              orderBy: { id: "asc" },
              include: {
                qaqcRecords: true,
              },
            },
            lithologies: true,
          },
        },
      },
    });
  },

  async createDrillHole(data: CreateDrillHoleDTO, userId: number) {
    const [project, zone] = await Promise.all([
      prisma.project.findUnique({ where: { id: data.projectId } }),
      prisma.zone.findUnique({ where: { id: data.zoneId } }),
    ]);

    if (!project) {
      throw new HttpError("Project not found", 404);
    }
    if (!zone) {
      throw new HttpError("Zone not found", 404);
    }
    if (zone.projectId !== data.projectId) {
      throw new HttpError("Zone does not belong to project", 400);
    }

    const drillHole = await prisma.drillHole.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_DRILL_HOLE", { drillHoleId: drillHole.id, ...data }, userId);

    logger.info(
      { userId, drillHoleId: drillHole.id, action: "CREATE_DRILL_HOLE" },
      "Drill hole created",
    );
    return drillHole;
  },

  async updateDrillHole(id: number, data: UpdateDrillHoleDTO, userId: number) {
    const drillHole = await prisma.drillHole.findUnique({ where: { id } });
    if (!drillHole) {
      throw new HttpError("Drill hole not found", 404);
    }

    if (data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: data.projectId } });
      if (!project) {
        throw new HttpError("Project not found", 404);
      }
    }
    if (data.zoneId) {
      const zone = await prisma.zone.findUnique({ where: { id: data.zoneId } });
      if (!zone) {
        throw new HttpError("Zone not found", 404);
      }
    }

    const updated = await prisma.drillHole.update({
      where: { id },
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("UPDATE_DRILL_HOLE", { drillHoleId: id, changes: data }, userId);

    logger.info({ userId, drillHoleId: id, action: "UPDATE_DRILL_HOLE" }, "Drill hole updated");
    return updated;
  },

  async deleteDrillHole(id: number) {
    const dh = await prisma.drillHole.findUnique({ where: { id } });
    if (!dh) throw new HttpError("Drill hole not found", 404);
    return prisma.drillHole.delete({ where: { id } });
  },

  async getIntervals(query: IntervalQuery) {
    const { page, limit, skip } = getPagination(query);
    return prisma.interval.findMany({
      where: { drillHoleId: query.drillHoleId },
      skip,
      take: limit,
      orderBy: { fromDepth: "asc" },
      include: {
        drillHole: {
          select: {
            id: true,
            name: true,
          },
        },
        assays: {
          include: {
            qaqcRecords: true,
          },
        },
        lithologies: true,
      },
    });
  },

  async getIntervalById(id: number) {
    return prisma.interval.findUnique({
      where: { id },
      include: {
        drillHole: {
          select: {
            id: true,
            name: true,
          },
        },
        assays: {
          include: {
            qaqcRecords: true,
          },
        },
        lithologies: true,
      },
    });
  },

  async createInterval(data: CreateIntervalDTO, userId: number) {
    const drillHole = await prisma.drillHole.findUnique({ where: { id: data.drillHoleId } });
    if (!drillHole) {
      throw new HttpError("Drill hole not found", 404);
    }
    if (data.fromDepth > data.toDepth) {
      throw new HttpError("fromDepth must be less than or equal to toDepth", 400);
    }

    const interval = await prisma.interval.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_INTERVAL", { intervalId: interval.id, ...data }, userId);

    logger.info({ userId, intervalId: interval.id, action: "CREATE_INTERVAL" }, "Interval created");
    return interval;
  },

  async updateInterval(id: number, data: UpdateIntervalDTO, userId: number) {
    const interval = await prisma.interval.findUnique({ where: { id } });
    if (!interval) {
      throw new HttpError("Interval not found", 404);
    }
    if (data.drillHoleId) {
      const drillHole = await prisma.drillHole.findUnique({ where: { id: data.drillHoleId } });
      if (!drillHole) {
        throw new HttpError("Drill hole not found", 404);
      }
    }
    if (
      data.fromDepth !== undefined &&
      data.toDepth !== undefined &&
      data.fromDepth > data.toDepth
    ) {
      throw new HttpError("fromDepth must be less than or equal to toDepth", 400);
    }

    const updated = await prisma.interval.update({
      where: { id },
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("UPDATE_INTERVAL", { intervalId: id, changes: data }, userId);

    logger.info({ userId, intervalId: id, action: "UPDATE_INTERVAL" }, "Interval updated");
    return updated;
  },

  async deleteInterval(id: number) {
    const interval = await prisma.interval.findUnique({ where: { id } });
    if (!interval) throw new HttpError("Interval not found", 404);
    return prisma.interval.delete({ where: { id } });
  },

  async getAssays(query: AssayQuery) {
    const { page, limit, skip } = getPagination(query);
    return prisma.assay.findMany({
      where: { intervalId: query.intervalId },
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: {
        interval: {
          select: {
            id: true,
            fromDepth: true,
            toDepth: true,
            drillHoleId: true,
          },
        },
        qaqcRecords: true,
      },
    });
  },

  async getAssayById(id: number) {
    return prisma.assay.findUnique({
      where: { id },
      include: {
        interval: {
          select: {
            id: true,
            fromDepth: true,
            toDepth: true,
            drillHoleId: true,
          },
        },
        qaqcRecords: true,
      },
    });
  },

  async createAssay(data: CreateAssayDTO, userId: number) {
    const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
    if (!interval) {
      throw new HttpError("Interval not found", 404);
    }

    const assay = await prisma.assay.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_ASSAY", { assayId: assay.id, ...data }, userId);

    logger.info({ userId, assayId: assay.id, action: "CREATE_ASSAY" }, "Assay created");
    return assay;
  },

  async updateAssay(id: number, data: UpdateAssayDTO, userId: number) {
    const assay = await prisma.assay.findUnique({ where: { id } });
    if (!assay) {
      throw new HttpError("Assay not found", 404);
    }
    if (data.intervalId) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) {
        throw new HttpError("Interval not found", 404);
      }
    }

    const updated = await prisma.assay.update({
      where: { id },
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("UPDATE_ASSAY", { assayId: id, changes: data }, userId);

    logger.info({ userId, assayId: id, action: "UPDATE_ASSAY" }, "Assay updated");
    return updated;
  },

  async deleteAssay(id: number) {
    const assay = await prisma.assay.findUnique({ where: { id } });
    if (!assay) throw new HttpError("Assay not found", 404);
    return prisma.assay.delete({ where: { id } });
  },

  async getLithologies(query: LithologyQuery) {
    const { page, limit, skip } = getPagination(query);
    return prisma.lithology.findMany({
      where: { intervalId: query.intervalId },
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: {
        interval: {
          select: {
            id: true,
            fromDepth: true,
            toDepth: true,
            drillHoleId: true,
          },
        },
      },
    });
  },

  async getLithologyById(id: number) {
    return prisma.lithology.findUnique({
      where: { id },
      include: {
        interval: {
          select: {
            id: true,
            fromDepth: true,
            toDepth: true,
            drillHoleId: true,
          },
        },
      },
    });
  },

  async createLithology(data: CreateLithologyDTO, userId: number) {
    const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
    if (!interval) {
      throw new HttpError("Interval not found", 404);
    }

    const lithology = await prisma.lithology.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_LITHOLOGY", { lithologyId: lithology.id, ...data }, userId);

    logger.info(
      { userId, lithologyId: lithology.id, action: "CREATE_LITHOLOGY" },
      "Lithology created",
    );
    return lithology;
  },

  async updateLithology(id: number, data: UpdateLithologyDTO, userId: number) {
    const lithology = await prisma.lithology.findUnique({ where: { id } });
    if (!lithology) {
      throw new HttpError("Lithology not found", 404);
    }
    if (data.intervalId) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) {
        throw new HttpError("Interval not found", 404);
      }
    }

    const updated = await prisma.lithology.update({
      where: { id },
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("UPDATE_LITHOLOGY", { lithologyId: id, changes: data }, userId);

    logger.info({ userId, lithologyId: id, action: "UPDATE_LITHOLOGY" }, "Lithology updated");
    return updated;
  },

  async deleteLithology(id: number) {
    const lithology = await prisma.lithology.findUnique({ where: { id } });
    if (!lithology) throw new HttpError("Lithology not found", 404);
    return prisma.lithology.delete({ where: { id } });
  },

  async getQAQCs(query: QAQCQuery) {
    const { page, limit, skip } = getPagination(query);
    return prisma.qAQC.findMany({
      where: { assayId: query.assayId },
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: {
        assay: {
          select: {
            id: true,
            au: true,
            cu: true,
            ag: true,
            intervalId: true,
          },
        },
      },
    });
  },

  async getQAQCById(id: number) {
    return prisma.qAQC.findUnique({
      where: { id },
      include: {
        assay: {
          select: {
            id: true,
            au: true,
            cu: true,
            ag: true,
            intervalId: true,
          },
        },
      },
    });
  },

  async createQAQC(data: CreateQAQCDTO, userId: number) {
    const assay = await prisma.assay.findUnique({ where: { id: data.assayId } });
    if (!assay) {
      throw new HttpError("Assay not found", 404);
    }

    const qaqc = await prisma.qAQC.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_QAQC", { qaqcId: qaqc.id, ...data }, userId);

    logger.info({ userId, qaqcId: qaqc.id, action: "CREATE_QAQC" }, "QAQC created");
    return qaqc;
  },

  async updateQAQC(id: number, data: UpdateQAQCDTO, userId: number) {
    const qaqc = await prisma.qAQC.findUnique({ where: { id } });
    if (!qaqc) {
      throw new HttpError("QAQC not found", 404);
    }
    if (data.assayId) {
      const assay = await prisma.assay.findUnique({ where: { id: data.assayId } });
      if (!assay) {
        throw new HttpError("Assay not found", 404);
      }
    }

    const updated = await prisma.qAQC.update({
      where: { id },
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("UPDATE_QAQC", { qaqcId: id, changes: data }, userId);

    logger.info({ userId, qaqcId: id, action: "UPDATE_QAQC" }, "QAQC updated");
    return updated;
  },

  async deleteQAQC(id: number) {
    const qaqc = await prisma.qAQC.findUnique({ where: { id } });
    if (!qaqc) throw new HttpError("QAQC not found", 404);
    return prisma.qAQC.delete({ where: { id } });
  },

  async getResources(query: ResourceQuery) {
    const { page, limit, skip } = getPagination(query);
    return prisma.resource.findMany({
      where: { projectId: query.projectId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async getResourceById(id: number) {
    return prisma.resource.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async createResource(data: CreateResourceDTO, userId: number) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) {
      throw new HttpError("Project not found", 404);
    }

    const resource = await prisma.resource.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_RESOURCE", { resourceId: resource.id, ...data }, userId);

    logger.info({ userId, resourceId: resource.id, action: "CREATE_RESOURCE" }, "Resource created");
    return resource;
  },

  async updateResource(id: number, data: UpdateResourceDTO, userId: number) {
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      throw new HttpError("Resource not found", 404);
    }

    if (data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: data.projectId } });
      if (!project) {
        throw new HttpError("Project not found", 404);
      }
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("UPDATE_RESOURCE", { resourceId: id, changes: data }, userId);

    logger.info({ userId, resourceId: id, action: "UPDATE_RESOURCE" }, "Resource updated");
    return updated;
  },

  async deleteResource(id: number) {
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new HttpError("Resource not found", 404);
    return prisma.resource.delete({ where: { id } });
  },

  // ─── DrillHoleSurvey ───────────────────────────────────────────────────────
  async getDrillHoleSurveys(query: DrillHoleSurveyQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};
    if (query.drillHoleId) where.drillHoleId = query.drillHoleId;
    return prisma.drillHoleSurvey.findMany({
      where,
      skip,
      take: limit,
      orderBy: { depth: "asc" },
      include: { drillHole: { select: { id: true, name: true } } },
    });
  },

  async getDrillHoleSurveyById(id: number) {
    return prisma.drillHoleSurvey.findUnique({
      where: { id },
      include: { drillHole: { select: { id: true, name: true } } },
    });
  },

  async createDrillHoleSurvey(data: CreateDrillHoleSurveyDTO, userId: number) {
    if (data.drillHoleId !== undefined) {
      const drillHole = await prisma.drillHole.findUnique({ where: { id: data.drillHoleId } });
      if (!drillHole) throw new HttpError("Drill hole not found", 404);
    }

    const survey = await prisma.drillHoleSurvey.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_DRILL_HOLE_SURVEY", { surveyId: survey.id, ...data }, userId);
    logger.info({ userId, surveyId: survey.id, action: "CREATE_DRILL_HOLE_SURVEY" }, "DrillHoleSurvey created");
    return survey;
  },

  async updateDrillHoleSurvey(id: number, data: UpdateDrillHoleSurveyDTO, userId: number) {
    const survey = await prisma.drillHoleSurvey.findUnique({ where: { id } });
    if (!survey) throw new HttpError("DrillHoleSurvey not found", 404);

    if (data.drillHoleId) {
      const drillHole = await prisma.drillHole.findUnique({ where: { id: data.drillHoleId } });
      if (!drillHole) throw new HttpError("Drill hole not found", 404);
    }

    const updated = await prisma.drillHoleSurvey.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });

    safeLog("UPDATE_DRILL_HOLE_SURVEY", { surveyId: id, changes: data }, userId);
    logger.info({ userId, surveyId: id, action: "UPDATE_DRILL_HOLE_SURVEY" }, "DrillHoleSurvey updated");
    return updated;
  },

  async deleteDrillHoleSurvey(id: number) {
    const survey = await prisma.drillHoleSurvey.findUnique({ where: { id } });
    if (!survey) throw new HttpError("DrillHoleSurvey not found", 404);
    return prisma.drillHoleSurvey.delete({ where: { id } });
  },

  // ─── AssayValue ────────────────────────────────────────────────────────────
  async getAssayValues(query: AssayValueQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};
    if (query.assayId) where.assayId = query.assayId;
    if (query.element) where.element = { contains: String(query.element), mode: "insensitive" as const };
    return prisma.assayValue.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: { assay: { select: { id: true, intervalId: true } } },
    });
  },

  async getAssayValueById(id: number) {
    return prisma.assayValue.findUnique({
      where: { id },
      include: { assay: { select: { id: true, intervalId: true } } },
    });
  },

  async createAssayValue(data: CreateAssayValueDTO, userId: number) {
    if (data.assayId !== undefined) {
      const assay = await prisma.assay.findUnique({ where: { id: data.assayId } });
      if (!assay) throw new HttpError("Assay not found", 404);
    }

    const value = await prisma.assayValue.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_ASSAY_VALUE", { assayValueId: value.id, ...data }, userId);
    logger.info({ userId, assayValueId: value.id, action: "CREATE_ASSAY_VALUE" }, "AssayValue created");
    return value;
  },

  async updateAssayValue(id: number, data: UpdateAssayValueDTO, userId: number) {
    const value = await prisma.assayValue.findUnique({ where: { id } });
    if (!value) throw new HttpError("AssayValue not found", 404);

    if (data.assayId) {
      const assay = await prisma.assay.findUnique({ where: { id: data.assayId } });
      if (!assay) throw new HttpError("Assay not found", 404);
    }

    const updated = await prisma.assayValue.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });

    safeLog("UPDATE_ASSAY_VALUE", { assayValueId: id, changes: data }, userId);
    logger.info({ userId, assayValueId: id, action: "UPDATE_ASSAY_VALUE" }, "AssayValue updated");
    return updated;
  },

  async deleteAssayValue(id: number) {
    const value = await prisma.assayValue.findUnique({ where: { id } });
    if (!value) throw new HttpError("AssayValue not found", 404);
    return prisma.assayValue.delete({ where: { id } });
  },

  // ─── Alteration ────────────────────────────────────────────────────────────
  async getAlterations(query: AlterationQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};
    if (query.intervalId) where.intervalId = query.intervalId;
    return prisma.alteration.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async getAlterationById(id: number) {
    return prisma.alteration.findUnique({
      where: { id },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async createAlteration(data: CreateAlterationDTO, userId: number) {
    if (data.intervalId !== undefined) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const alteration = await prisma.alteration.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_ALTERATION", { alterationId: alteration.id, ...data }, userId);
    logger.info({ userId, alterationId: alteration.id, action: "CREATE_ALTERATION" }, "Alteration created");
    return alteration;
  },

  async updateAlteration(id: number, data: UpdateAlterationDTO, userId: number) {
    const alteration = await prisma.alteration.findUnique({ where: { id } });
    if (!alteration) throw new HttpError("Alteration not found", 404);

    if (data.intervalId) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const updated = await prisma.alteration.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });

    safeLog("UPDATE_ALTERATION", { alterationId: id, changes: data }, userId);
    logger.info({ userId, alterationId: id, action: "UPDATE_ALTERATION" }, "Alteration updated");
    return updated;
  },

  async deleteAlteration(id: number) {
    const alteration = await prisma.alteration.findUnique({ where: { id } });
    if (!alteration) throw new HttpError("Alteration not found", 404);
    return prisma.alteration.delete({ where: { id } });
  },

  // ─── Mineralization ────────────────────────────────────────────────────────
  async getMineralizations(query: MineralizationQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};
    if (query.intervalId) where.intervalId = query.intervalId;
    return prisma.mineralization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async getMineralizationById(id: number) {
    return prisma.mineralization.findUnique({
      where: { id },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async createMineralization(data: CreateMineralizationDTO, userId: number) {
    if (data.intervalId !== undefined) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const mineralization = await prisma.mineralization.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_MINERALIZATION", { mineralizationId: mineralization.id, ...data }, userId);
    logger.info({ userId, mineralizationId: mineralization.id, action: "CREATE_MINERALIZATION" }, "Mineralization created");
    return mineralization;
  },

  async updateMineralization(id: number, data: UpdateMineralizationDTO, userId: number) {
    const mineralization = await prisma.mineralization.findUnique({ where: { id } });
    if (!mineralization) throw new HttpError("Mineralization not found", 404);

    if (data.intervalId) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const updated = await prisma.mineralization.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });

    safeLog("UPDATE_MINERALIZATION", { mineralizationId: id, changes: data }, userId);
    logger.info({ userId, mineralizationId: id, action: "UPDATE_MINERALIZATION" }, "Mineralization updated");
    return updated;
  },

  async deleteMineralization(id: number) {
    const mineralization = await prisma.mineralization.findUnique({ where: { id } });
    if (!mineralization) throw new HttpError("Mineralization not found", 404);
    return prisma.mineralization.delete({ where: { id } });
  },

  // ─── GeologicalStructure ───────────────────────────────────────────────────
  async getGeologicalStructures(query: GeologicalStructureQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};
    if (query.intervalId) where.intervalId = query.intervalId;
    return prisma.geologicalStructure.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async getGeologicalStructureById(id: number) {
    return prisma.geologicalStructure.findUnique({
      where: { id },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async createGeologicalStructure(data: CreateGeologicalStructureDTO, userId: number) {
    if (data.intervalId !== undefined) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const structure = await prisma.geologicalStructure.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_GEOLOGICAL_STRUCTURE", { structureId: structure.id, ...data }, userId);
    logger.info({ userId, structureId: structure.id, action: "CREATE_GEOLOGICAL_STRUCTURE" }, "GeologicalStructure created");
    return structure;
  },

  async updateGeologicalStructure(id: number, data: UpdateGeologicalStructureDTO, userId: number) {
    const structure = await prisma.geologicalStructure.findUnique({ where: { id } });
    if (!structure) throw new HttpError("GeologicalStructure not found", 404);

    if (data.intervalId) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const updated = await prisma.geologicalStructure.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });

    safeLog("UPDATE_GEOLOGICAL_STRUCTURE", { structureId: id, changes: data }, userId);
    logger.info({ userId, structureId: id, action: "UPDATE_GEOLOGICAL_STRUCTURE" }, "GeologicalStructure updated");
    return updated;
  },

  async deleteGeologicalStructure(id: number) {
    const structure = await prisma.geologicalStructure.findUnique({ where: { id } });
    if (!structure) throw new HttpError("GeologicalStructure not found", 404);
    return prisma.geologicalStructure.delete({ where: { id } });
  },

  // ─── Recovery ──────────────────────────────────────────────────────────────
  async getRecoveries(query: RecoveryQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};
    if (query.intervalId) where.intervalId = query.intervalId;
    return prisma.recovery.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async getRecoveryById(id: number) {
    return prisma.recovery.findUnique({
      where: { id },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async createRecovery(data: CreateRecoveryDTO, userId: number) {
    if (data.intervalId !== undefined) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const recovery = await prisma.recovery.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_RECOVERY", { recoveryId: recovery.id, ...data }, userId);
    logger.info({ userId, recoveryId: recovery.id, action: "CREATE_RECOVERY" }, "Recovery created");
    return recovery;
  },

  async updateRecovery(id: number, data: UpdateRecoveryDTO, userId: number) {
    const recovery = await prisma.recovery.findUnique({ where: { id } });
    if (!recovery) throw new HttpError("Recovery not found", 404);

    if (data.intervalId) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const updated = await prisma.recovery.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });

    safeLog("UPDATE_RECOVERY", { recoveryId: id, changes: data }, userId);
    logger.info({ userId, recoveryId: id, action: "UPDATE_RECOVERY" }, "Recovery updated");
    return updated;
  },

  async deleteRecovery(id: number) {
    const recovery = await prisma.recovery.findUnique({ where: { id } });
    if (!recovery) throw new HttpError("Recovery not found", 404);
    return prisma.recovery.delete({ where: { id } });
  },

  // ─── Density ───────────────────────────────────────────────────────────────
  async getDensities(query: DensityQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};
    if (query.intervalId) where.intervalId = query.intervalId;
    return prisma.density.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async getDensityById(id: number) {
    return prisma.density.findUnique({
      where: { id },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async createDensity(data: CreateDensityDTO, userId: number) {
    if (data.intervalId !== undefined) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const density = await prisma.density.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_DENSITY", { densityId: density.id, ...data }, userId);
    logger.info({ userId, densityId: density.id, action: "CREATE_DENSITY" }, "Density created");
    return density;
  },

  async updateDensity(id: number, data: UpdateDensityDTO, userId: number) {
    const density = await prisma.density.findUnique({ where: { id } });
    if (!density) throw new HttpError("Density not found", 404);

    if (data.intervalId) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const updated = await prisma.density.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });

    safeLog("UPDATE_DENSITY", { densityId: id, changes: data }, userId);
    logger.info({ userId, densityId: id, action: "UPDATE_DENSITY" }, "Density updated");
    return updated;
  },

  async deleteDensity(id: number) {
    const density = await prisma.density.findUnique({ where: { id } });
    if (!density) throw new HttpError("Density not found", 404);
    return prisma.density.delete({ where: { id } });
  },

  // ─── MagneticSusceptibility ────────────────────────────────────────────────
  async getMagneticSusceptibilities(query: MagneticSusceptibilityQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};
    if (query.intervalId) where.intervalId = query.intervalId;
    return prisma.magneticSusceptibility.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async getMagneticSusceptibilityById(id: number) {
    return prisma.magneticSusceptibility.findUnique({
      where: { id },
      include: { interval: { select: { id: true, fromDepth: true, toDepth: true } } },
    });
  },

  async createMagneticSusceptibility(data: CreateMagneticSusceptibilityDTO, userId: number) {
    if (data.intervalId !== undefined) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const ms = await prisma.magneticSusceptibility.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_MAGNETIC_SUSCEPTIBILITY", { msId: ms.id, ...data }, userId);
    logger.info({ userId, msId: ms.id, action: "CREATE_MAGNETIC_SUSCEPTIBILITY" }, "MagneticSusceptibility created");
    return ms;
  },

  async updateMagneticSusceptibility(id: number, data: UpdateMagneticSusceptibilityDTO, userId: number) {
    const ms = await prisma.magneticSusceptibility.findUnique({ where: { id } });
    if (!ms) throw new HttpError("MagneticSusceptibility not found", 404);

    if (data.intervalId) {
      const interval = await prisma.interval.findUnique({ where: { id: data.intervalId } });
      if (!interval) throw new HttpError("Interval not found", 404);
    }

    const updated = await prisma.magneticSusceptibility.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });

    safeLog("UPDATE_MAGNETIC_SUSCEPTIBILITY", { msId: id, changes: data }, userId);
    logger.info({ userId, msId: id, action: "UPDATE_MAGNETIC_SUSCEPTIBILITY" }, "MagneticSusceptibility updated");
    return updated;
  },

  async deleteMagneticSusceptibility(id: number) {
    const ms = await prisma.magneticSusceptibility.findUnique({ where: { id } });
    if (!ms) throw new HttpError("MagneticSusceptibility not found", 404);
    return prisma.magneticSusceptibility.delete({ where: { id } });
  },

  // ─── SignificantIntercept ──────────────────────────────────────────────────
  async getSignificantIntercepts(query: SignificantInterceptQuery) {
    const { page, limit, skip } = getPagination(query);
    const where: any = {};
    if (query.drillHoleId) where.drillHoleId = query.drillHoleId;
    if (query.zoneId) where.drillHole = { zoneId: query.zoneId };

    return prisma.significantIntercept.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ drillHoleId: "asc" }, { fromDepth: "asc" }],
      include: {
        drillHole: {
          select: {
            id: true,
            name: true,
            zoneId: true,
            zone: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  async getSignificantInterceptById(id: number) {
    return prisma.significantIntercept.findUnique({
      where: { id },
      include: {
        drillHole: {
          select: {
            id: true,
            name: true,
            zone: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  async createSignificantIntercept(data: CreateSignificantInterceptDTO, userId: number) {
    const drillHole = await prisma.drillHole.findUnique({ where: { id: data.drillHoleId } });
    if (!drillHole) throw new HttpError("DrillHole not found", 404);

    const intercept = await prisma.significantIntercept.create({
      data: { ...data, createdById: userId, updatedById: userId } as any,
    });

    safeLog("CREATE_SIGNIFICANT_INTERCEPT", { interceptId: intercept.id, ...data }, userId);
    logger.info({ userId, interceptId: intercept.id, action: "CREATE_SIGNIFICANT_INTERCEPT" }, "SignificantIntercept created");
    return intercept;
  },

  async updateSignificantIntercept(id: number, data: UpdateSignificantInterceptDTO, userId: number) {
    const intercept = await prisma.significantIntercept.findUnique({ where: { id } });
    if (!intercept) throw new HttpError("SignificantIntercept not found", 404);

    if (data.drillHoleId) {
      const drillHole = await prisma.drillHole.findUnique({ where: { id: data.drillHoleId } });
      if (!drillHole) throw new HttpError("DrillHole not found", 404);
    }

    const updated = await prisma.significantIntercept.update({
      where: { id },
      data: { ...data, updatedById: userId } as any,
    });

    safeLog("UPDATE_SIGNIFICANT_INTERCEPT", { interceptId: id, changes: data }, userId);
    logger.info({ userId, interceptId: id, action: "UPDATE_SIGNIFICANT_INTERCEPT" }, "SignificantIntercept updated");
    return updated;
  },

  async deleteSignificantIntercept(id: number) {
    const intercept = await prisma.significantIntercept.findUnique({ where: { id } });
    if (!intercept) throw new HttpError("SignificantIntercept not found", 404);
    return prisma.significantIntercept.delete({ where: { id } });
  },
};


