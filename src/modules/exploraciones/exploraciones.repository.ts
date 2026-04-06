import { prisma } from "../../config/prisma.js";
import type { CreateElementoDTO, CreateMuestraDTO } from "./exploraciones.types.js";

type CreateElementoRepoDTO = {
  nombre: string;
  unidad?: string | null;
};

export const exploracionesRepository = {
  async createUbicacion(data: {
    nivel: string;
    este?: number | null;
    norte?: number | null;
    elevacion?: number | null;
    referenciaLugar?: string | null;
  }) {
    return prisma.ubicacion.create({ data });
  },

  async createMuestra(data: {
    nombre: string;
    numero?: number | null;
    laboratorio1?: string | null;
    laboratorio2?: string | null;
    laboratorio3?: string | null;
    fechaMuestreo?: Date | null;
    fechaEntrega?: Date | null;
    descripcion?: string | null;
    usuarioId?: number | null;
    ubicacionId: string;
  }) {
    return prisma.muestra.create({ data });
  },

  async findElementoByName(nombre: string) {
    return prisma.elemento.findFirst({
      where: { nombre: { equals: nombre, mode: "insensitive" } },
    });
  },

  async createElemento(data: CreateElementoRepoDTO) {
    return prisma.elemento.create({ data });
  },

  async upsertResultado(muestraId: string, elementoId: string, valor: number) {
    return prisma.resultado.upsert({
      where: { muestraId_elementoId: { muestraId, elementoId } },
      update: { valor },
      create: { muestraId, elementoId, valor },
    });
  },

  async updateUbicacion(
    id: string,
    data: {
      nivel?: string;
      este?: number | null;
      norte?: number | null;
      elevacion?: number | null;
      referenciaLugar?: string | null;
    },
  ) {
    return prisma.ubicacion.update({
      where: { id },
      data,
    });
  },

  async updateMuestra(
    id: string,
    data: {
      nombre?: string;
      numero?: number | null;
      laboratorio1?: string | null;
      laboratorio2?: string | null;
      laboratorio3?: string | null;
      fechaMuestreo?: Date | null;
      fechaEntrega?: Date | null;
      descripcion?: string | null;
    },
  ) {
    return prisma.muestra.update({
      where: { id },
      data,
    });
  },

  async deleteResultadosByMuestraId(muestraId: string) {
    return prisma.resultado.deleteMany({
      where: { muestraId },
    });
  },

  async getLaboratorios() {
    const labs1 = await prisma.muestra.findMany({
      where: { laboratorio1: { not: null } },
      select: { laboratorio1: true },
      distinct: ["laboratorio1"],
    });
    const labs2 = await prisma.muestra.findMany({
      where: { laboratorio2: { not: null } },
      select: { laboratorio2: true },
      distinct: ["laboratorio2"],
    });
    const labs3 = await prisma.muestra.findMany({
      where: { laboratorio3: { not: null } },
      select: { laboratorio3: true },
      distinct: ["laboratorio3"],
    });

    const uniqueLabs = new Set<string>();
    labs1.forEach((l) => l.laboratorio1 && uniqueLabs.add(l.laboratorio1));
    labs2.forEach((l) => l.laboratorio2 && uniqueLabs.add(l.laboratorio2));
    labs3.forEach((l) => l.laboratorio3 && uniqueLabs.add(l.laboratorio3));

    return Array.from(uniqueLabs).sort();
  },

  async getElementos() {
    return prisma.elemento.findMany({ orderBy: { nombre: "asc" } });
  },

  async getMuestras(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [muestras, total] = await Promise.all([
      prisma.muestra.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          ubicacion: true,
          resultados: { include: { elemento: true } },
        },
      }),
      prisma.muestra.count(),
    ]);

    return { muestras, total };
  },

  async getMuestraById(id: string) {
    return prisma.muestra.findUnique({
      where: { id },
      include: {
        ubicacion: true,
        resultados: { include: { elemento: true } },
      },
    });
  },

  async getAllUbicaciones() {
    return prisma.ubicacion.findMany({ orderBy: { createdAt: "desc" } });
  },

  async getAllMuestras() {
    return prisma.muestra.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        ubicacion: true,
        resultados: { include: { elemento: true } },
        usuario: true,
      },
    });
  },

  async getAllResultados() {
    return prisma.resultado.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        muestra: true,
        elemento: true,
      },
    });
  },
};
