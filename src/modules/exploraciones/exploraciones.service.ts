import { prisma } from "../../config/prisma.js";
import type { CreateMuestraDTO, CreateElementoDTO } from "./exploraciones.types.js";
import { HttpError } from "../../errors/http.error.js";
import { logger } from "../../config/logger.js";

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError("Fecha inválida", 400);
  }
  return date;
}

export const exploracionesService = {
  async createElemento(data: CreateElementoDTO) {
    const nombre = data.nombre.trim();

    if (!nombre) {
      throw new HttpError("Elemento debe tener nombre", 400);
    }

    const existing = await prisma.elemento.findFirst({
      where: { nombre: { equals: nombre, mode: "insensitive" } },
    });

    if (existing) {
      return existing;
    }

    return prisma.elemento.create({
      data: {
        nombre,
        unidad: data.unidad?.trim() ?? null,
      },
    });
  },

  async getElementos() {
    return prisma.elemento.findMany({ orderBy: { nombre: "asc" } });
  },

  async createMuestra(payload: CreateMuestraDTO, userId?: number) {
    const ubicacionData = payload.ubicacion || {};

    const ubicacion = await prisma.ubicacion.create({
      data: {
        nivel: ubicacionData.nivel?.trim() ?? null,
        sector: ubicacionData.sector?.trim() ?? null,
        galeria: ubicacionData.galeria?.trim() ?? null,
        punto: ubicacionData.punto?.trim() ?? null,
        x: ubicacionData.x ?? null,
        y: ubicacionData.y ?? null,
        z: ubicacionData.z ?? null,
        elevacion: ubicacionData.elevacion ?? null,
      },
    });

    const muestra = await prisma.muestra.create({
      data: {
        codigo: payload.codigo.trim(),
        numero: payload.numero ?? null,
        tipo: payload.tipo?.trim() ?? null,
        fechaMuestreo: parseDate(payload.fechaMuestreo),
        fechaEntrega: parseDate(payload.fechaEntrega),
        descripcion: payload.descripcion?.trim() ?? null,
        usuarioId: userId ?? null,
        ubicacionId: ubicacion.id,
      },
    });

    if (payload.resultados && payload.resultados.length > 0) {
      for (const resultado of payload.resultados) {
        const elementoNombre = resultado.elemento.trim();
        if (!elementoNombre) continue;

        const elemento = await this.createElemento({ nombre: elementoNombre });

        await prisma.resultado.upsert({
          where: {
            muestraId_elementoId: {
              muestraId: muestra.id,
              elementoId: elemento.id,
            },
          },
          update: { valor: resultado.valor },
          create: {
            muestraId: muestra.id,
            elementoId: elemento.id,
            valor: resultado.valor,
          },
        });
      }
    }

    if (payload.atributos && payload.atributos.length > 0) {
      for (const el of payload.atributos) {
        const nombre = el.nombre.trim();
        const valor = el.valor.trim();

        if (!nombre) continue;

        const atributo =
          (await prisma.atributo.findFirst({
            where: { nombre: { equals: nombre, mode: "insensitive" } },
          })) ||
          (await prisma.atributo.create({
            data: { nombre },
          }));

        await prisma.muestraAtributo.create({
          data: {
            muestraId: muestra.id,
            atributoId: atributo.id,
            valor,
          },
        });
      }
    }

    logger.info({ action: "CREATE_MUESTRA", muestraId: muestra.id, userId }, "Muestra creada");

    return this.getMuestraById(muestra.id);
  },

  async getMuestras(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [muestras, total] = await Promise.all([
      prisma.muestra.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          ubicacion: true,
          resultados: { include: { elemento: true } },
          atributos: { include: { atributo: true } },
        },
      }),
      prisma.muestra.count(),
    ]);

    return { muestras, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getMuestraById(id: string) {
    const muestra = await prisma.muestra.findUnique({
      where: { id },
      include: {
        ubicacion: true,
        resultados: { include: { elemento: true } },
        atributos: { include: { atributo: true } },
      },
    });

    if (!muestra) {
      throw new HttpError("Muestra no encontrada", 404);
    }

    return muestra;
  },
};
