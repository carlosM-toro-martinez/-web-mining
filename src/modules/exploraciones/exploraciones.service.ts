import { exploracionesRepository } from "./exploraciones.repository.js";
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

    const existing = await exploracionesRepository.findElementByName(nombre);
    if (existing) {
      return existing;
    }

    return exploracionesRepository.createElement({
      name: nombre,
      symbol: data.simbolo?.trim() ?? null,
      unit: data.unidad?.trim() ?? null,
      description: data.descripcion?.trim() ?? null,
    });
  },

  async getElementos() {
    return exploracionesRepository.getElementos();
  },

  async createMuestra(payload: CreateMuestraDTO, userId?: number) {
    const samplePoint = await exploracionesRepository.createSamplePoint({
      miningLaborId: payload.ubicacion.miningLaborId,
      east: payload.ubicacion.este ?? null,
      north: payload.ubicacion.norte ?? null,
      elevation: payload.ubicacion.elevacion ?? null,
      reference: payload.ubicacion.referenciaLugar?.trim() ?? null,
      station: payload.ubicacion.estacion?.trim() ?? null,
    });

    const muestra = await exploracionesRepository.createSample({
      code: payload.nombre.trim(),
      sampleType: payload.sampleType,
      sampleNumber: payload.numero ?? null,
      laboratory1: payload.laboratorio1?.trim() ?? null,
      laboratory2: payload.laboratorio2?.trim() ?? null,
      laboratory3: payload.laboratorio3?.trim() ?? null,
      sector: payload.sector?.trim() ?? null,
      collectedAt: parseDate(payload.fechaMuestreo),
      deliveredAt: parseDate(payload.fechaEntrega),
      description: payload.descripcion?.trim() ?? null,
      userId: userId ?? null,
      samplePointId: samplePoint.id,
    });

    if (payload.resultados && payload.resultados.length > 0) {
      for (const resultado of payload.resultados) {
        const elementoNombre = resultado.elemento.trim();
        if (!elementoNombre) continue;

        let elemento = await exploracionesRepository.findElementByName(elementoNombre);
        if (!elemento) {
          elemento = await exploracionesRepository.createElement({ name: elementoNombre });
        }

        await exploracionesRepository.upsertResult(
          muestra.id,
          elemento.id,
          resultado.valor,
          resultado.prefijo ?? null,
        );
      }
    }

    logger.info({ action: "CREATE_MUESTRA", muestraId: muestra.id, userId }, "Muestra creada");

    return this.getMuestraById(muestra.id);
  },

  async getMuestras(page = 1, limit = 20) {
    const { muestras, total } = await exploracionesRepository.getMuestras(page, limit);
    return { muestras, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getMuestraById(id: string) {
    const muestra = await exploracionesRepository.getMuestraById(id);

    if (!muestra) {
      throw new HttpError("Muestra no encontrada", 404);
    }

    return muestra;
  },

  async updateMuestra(id: string, payload: CreateMuestraDTO, userId?: number) {
    const existing = await this.getMuestraById(id);

    await exploracionesRepository.updateSamplePoint((existing as any).samplePoint?.id ?? "", {
      miningLaborId: payload.ubicacion.miningLaborId,
      east: payload.ubicacion.este ?? null,
      north: payload.ubicacion.norte ?? null,
      elevation: payload.ubicacion.elevacion ?? null,
      reference: payload.ubicacion.referenciaLugar?.trim() ?? null,
      station: payload.ubicacion.estacion?.trim() ?? null,
    });

    await exploracionesRepository.updateSample(id, {
      code: payload.nombre.trim(),
      sampleType: payload.sampleType,
      sampleNumber: payload.numero ?? null,
      laboratory1: payload.laboratorio1?.trim() ?? null,
      laboratory2: payload.laboratorio2?.trim() ?? null,
      laboratory3: payload.laboratorio3?.trim() ?? null,
      sector: payload.sector?.trim() ?? null,
      collectedAt: parseDate(payload.fechaMuestreo),
      deliveredAt: parseDate(payload.fechaEntrega),
      description: payload.descripcion?.trim() ?? null,
    });

    await exploracionesRepository.deleteResultsBySampleId(id);

    if (payload.resultados && payload.resultados.length > 0) {
      for (const resultado of payload.resultados) {
        const elementoNombre = resultado.elemento.trim();
        if (!elementoNombre) continue;

        let elemento = await exploracionesRepository.findElementByName(elementoNombre);
        if (!elemento) {
          elemento = await exploracionesRepository.createElement({ name: elementoNombre });
        }

        await exploracionesRepository.upsertResult(
          id,
          elemento.id,
          resultado.valor,
          resultado.prefijo ?? null,
        );
      }
    }

    logger.info({ action: "UPDATE_MUESTRA", muestraId: id, userId }, "Muestra actualizada");

    return this.getMuestraById(id);
  },

  async getLaboratorios() {
    return exploracionesRepository.getLaboratorios();
  },

  async getAllUbicaciones() {
    return exploracionesRepository.getAllUbicaciones();
  },

  async getAllMuestras() {
    return exploracionesRepository.getAllMuestras();
  },

  async getAllResultados() {
    return exploracionesRepository.getAllResultados();
  },
};
