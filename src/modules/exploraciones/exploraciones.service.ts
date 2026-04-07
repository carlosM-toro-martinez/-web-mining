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

    const existing = await exploracionesRepository.findElementoByName(nombre);
    if (existing) {
      return existing;
    }

    return exploracionesRepository.createElemento({
      nombre,
      unidad: data.unidad?.trim() ?? null,
    });
  },

  async getElementos() {
    return exploracionesRepository.getElementos();
  },

  async createMuestra(payload: CreateMuestraDTO, userId?: number) {
    const ubicacion = await exploracionesRepository.createUbicacion({
      nivel: payload.ubicacion.nivel.trim(),
      este: payload.ubicacion.este ?? null,
      norte: payload.ubicacion.norte ?? null,
      elevacion: payload.ubicacion.elevacion ?? null,
      referenciaLugar: payload.ubicacion.referenciaLugar?.trim() ?? null,
    });

    const muestra = await exploracionesRepository.createMuestra({
      nombre: payload.nombre.trim(),
      numero: payload.numero ?? null,
      laboratorio1: payload.laboratorio1?.trim() ?? null,
      laboratorio2: payload.laboratorio2?.trim() ?? null,
      laboratorio3: payload.laboratorio3?.trim() ?? null,
      tipoMuestra: payload.tipoMuestra?.trim() ?? null,
      sector: payload.sector?.trim() ?? null,
      fechaMuestreo: parseDate(payload.fechaMuestreo),
      fechaEntrega: parseDate(payload.fechaEntrega),
      descripcion: payload.descripcion?.trim() ?? null,
      usuarioId: userId ?? null,
      ubicacionId: ubicacion.id,
    });

    if (payload.resultados && payload.resultados.length > 0) {
      for (const resultado of payload.resultados) {
        const elementoNombre = resultado.elemento.trim();
        if (!elementoNombre) continue;

        let elemento = await exploracionesRepository.findElementoByName(elementoNombre);
        if (!elemento) {
          elemento = await exploracionesRepository.createElemento({ nombre: elementoNombre });
        }

        await exploracionesRepository.upsertResultado(
          muestra.id,
          elemento.id,
          resultado.valor,
          resultado.prefijo,
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

    await exploracionesRepository.updateUbicacion(existing.ubicacion.id, {
      nivel: payload.ubicacion.nivel,
      este: payload.ubicacion.este ?? null,
      norte: payload.ubicacion.norte ?? null,
      elevacion: payload.ubicacion.elevacion ?? null,
      referenciaLugar: payload.ubicacion.referenciaLugar?.trim() ?? null,
    });

    await exploracionesRepository.updateMuestra(id, {
      nombre: payload.nombre.trim(),
      numero: payload.numero ?? null,
      laboratorio1: payload.laboratorio1?.trim() ?? null,
      laboratorio2: payload.laboratorio2?.trim() ?? null,
      laboratorio3: payload.laboratorio3?.trim() ?? null,
      tipoMuestra: payload.tipoMuestra?.trim() ?? null,
      sector: payload.sector?.trim() ?? null,
      fechaMuestreo: parseDate(payload.fechaMuestreo),
      fechaEntrega: parseDate(payload.fechaEntrega),
      descripcion: payload.descripcion?.trim() ?? null,
    });

    await exploracionesRepository.deleteResultadosByMuestraId(id);

    if (payload.resultados && payload.resultados.length > 0) {
      for (const resultado of payload.resultados) {
        const elementoNombre = resultado.elemento.trim();
        if (!elementoNombre) continue;

        let elemento = await exploracionesRepository.findElementoByName(elementoNombre);
        if (!elemento) {
          elemento = await exploracionesRepository.createElemento({ nombre: elementoNombre });
        }

        await exploracionesRepository.upsertResultado(
          id,
          elemento.id,
          resultado.valor,
          resultado.prefijo,
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
