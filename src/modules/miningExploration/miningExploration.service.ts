import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  AssayQuery,
  CreateAssayDTO,
  CreateDrillHoleDTO,
  CreateIntervalDTO,
  CreateLithologyDTO,
  CreateProjectDTO,
  CreateQAQCDTO,
  CreateResourceDTO,
  CreateZoneDTO,
  IntervalQuery,
  LithologyQuery,
  ProjectQuery,
  QAQCQuery,
  ResourceQuery,
  UpdateAssayDTO,
  UpdateDrillHoleDTO,
  UpdateIntervalDTO,
  UpdateLithologyDTO,
  UpdateProjectDTO,
  UpdateQAQCDTO,
  UpdateResourceDTO,
  UpdateZoneDTO,
  ZoneQuery,
} from "./miningExploration.types.js";

const getPagination = (query: { page?: number; limit?: number }) => {
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
      data: {
        ...data,
        createdById: userId,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_PROJECT",
        data: { projectId: project.id, ...data },
      },
    });

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
      data: {
        ...data,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_PROJECT",
        data: { projectId: id, changes: data },
      },
    });

    logger.info({ userId, projectId: id, action: "UPDATE_PROJECT" }, "Project updated");
    return updated;
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
      data: {
        ...data,
        createdById: userId,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_ZONE",
        data: { zoneId: zone.id, ...data },
      },
    });

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
      data: {
        ...data,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_ZONE",
        data: { zoneId: id, changes: data },
      },
    });

    logger.info({ userId, zoneId: id, action: "UPDATE_ZONE" }, "Zone updated");
    return updated;
  },

  async getDrillHoles(query: ZoneQuery) {
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
      data: {
        ...data,
        createdById: userId,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_DRILL_HOLE",
        data: { drillHoleId: drillHole.id, ...data },
      },
    });

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
      data: {
        ...data,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_DRILL_HOLE",
        data: { drillHoleId: id, changes: data },
      },
    });

    logger.info({ userId, drillHoleId: id, action: "UPDATE_DRILL_HOLE" }, "Drill hole updated");
    return updated;
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
      data: {
        ...data,
        createdById: userId,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_INTERVAL",
        data: { intervalId: interval.id, ...data },
      },
    });

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
      data: {
        ...data,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_INTERVAL",
        data: { intervalId: id, changes: data },
      },
    });

    logger.info({ userId, intervalId: id, action: "UPDATE_INTERVAL" }, "Interval updated");
    return updated;
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
      data: {
        ...data,
        createdById: userId,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_ASSAY",
        data: { assayId: assay.id, ...data },
      },
    });

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
      data: {
        ...data,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_ASSAY",
        data: { assayId: id, changes: data },
      },
    });

    logger.info({ userId, assayId: id, action: "UPDATE_ASSAY" }, "Assay updated");
    return updated;
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
      data: {
        ...data,
        createdById: userId,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_LITHOLOGY",
        data: { lithologyId: lithology.id, ...data },
      },
    });

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
      data: {
        ...data,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_LITHOLOGY",
        data: { lithologyId: id, changes: data },
      },
    });

    logger.info({ userId, lithologyId: id, action: "UPDATE_LITHOLOGY" }, "Lithology updated");
    return updated;
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
      data: {
        ...data,
        createdById: userId,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_QAQC",
        data: { qaqcId: qaqc.id, ...data },
      },
    });

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
      data: {
        ...data,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_QAQC",
        data: { qaqcId: id, changes: data },
      },
    });

    logger.info({ userId, qaqcId: id, action: "UPDATE_QAQC" }, "QAQC updated");
    return updated;
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
      data: {
        ...data,
        createdById: userId,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_RESOURCE",
        data: { resourceId: resource.id, ...data },
      },
    });

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
      data: {
        ...data,
        updatedById: userId,
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "UPDATE_RESOURCE",
        data: { resourceId: id, changes: data },
      },
    });

    logger.info({ userId, resourceId: id, action: "UPDATE_RESOURCE" }, "Resource updated");
    return updated;
  },
};
