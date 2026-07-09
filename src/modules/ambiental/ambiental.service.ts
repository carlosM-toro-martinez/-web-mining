import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../errors/http.error.js";
import { logger } from "../../config/logger.js";
import type {
  CrearPuntoDTO, ActualizarPuntoDTO, PuntosQueryDTO,
  CrearRegistroHidricoDTO, RegistrosHidricosQueryDTO,
  CrearRegistroResiduoDTO, RegistrosResiduoQueryDTO,
  CrearRegistroRuidoDTO, RegistrosRuidoQueryDTO,
  CrearRegistroSueloDTO, RegistrosSueloQueryDTO,
  CrearPozoDTO, ActualizarPozoDTO, PozosQueryDTO,
  CrearManifiestoDTO, ActualizarManifiestoDTO, ManifiestoQueryDTO,
} from "./ambiental.schema.js";

const usuarioSelect = { select: { id: true, nombre: true } } as const;
const puntoSelect   = { select: { id: true, nombre: true, tipo: true, latitud: true, longitud: true } } as const;

function buildFechaWhere(desde?: string, hasta?: string) {
  if (!desde && !hasta) return undefined;
  const range: any = {};
  if (desde) range.gte = new Date(desde);
  if (hasta) range.lte = new Date(hasta);
  return range;
}

export const ambientalService = {

  // ── Puntos de Monitoreo ──────────────────────────────────────────────────

  async getPuntos(query: PuntosQueryDTO) {
    const where: any = { activo: query.activo };
    if (query.tipo) where.tipo = query.tipo;
    const puntos = await prisma.puntoMonitoreo.findMany({
      where,
      orderBy: { nombre: "asc" },
    });
    return { total: puntos.length, puntos };
  },

  async createPunto(data: CrearPuntoDTO) {
    const punto = await prisma.puntoMonitoreo.create({
      data: {
        nombre:      data.nombre,
        descripcion: data.descripcion ?? null,
        latitud:     data.latitud,
        longitud:    data.longitud,
        tipo:        data.tipo,
      },
    });
    logger.info({ id: punto.id }, "Punto de monitoreo creado");
    return punto;
  },

  async updatePunto(id: number, data: ActualizarPuntoDTO) {
    const existente = await prisma.puntoMonitoreo.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Punto de monitoreo no encontrado", 404);
    const updates: Record<string, unknown> = {};
    if (data.nombre      !== undefined) updates.nombre      = data.nombre;
    if (data.descripcion !== undefined) updates.descripcion = data.descripcion;
    if (data.latitud     !== undefined) updates.latitud     = data.latitud;
    if (data.longitud    !== undefined) updates.longitud    = data.longitud;
    if (data.tipo        !== undefined) updates.tipo        = data.tipo;
    if (data.activo      !== undefined) updates.activo      = data.activo;
    const actualizado = await prisma.puntoMonitoreo.update({ where: { id }, data: updates });
    logger.info({ id }, "Punto de monitoreo actualizado");
    return actualizado;
  },

  async deletePunto(id: number) {
    const existente = await prisma.puntoMonitoreo.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Punto de monitoreo no encontrado", 404);
    await prisma.puntoMonitoreo.update({ where: { id }, data: { activo: false } });
    logger.info({ id }, "Punto de monitoreo desactivado");
  },

  // ── Mapa ambiental (último estado de cada punto para el mapa) ────────────

  async getMapaAmbiental() {
    const [puntos, pozos] = await Promise.all([
      prisma.puntoMonitoreo.findMany({
        where: { activo: true },
        include: {
          registrosHidricos: {
            orderBy: { fecha: "desc" },
            take: 1,
            select: { fecha: true, calidadAgua: true, ph: true, temperatura: true, turbidez: true },
          },
          registrosRuido: {
            orderBy: { fecha: "desc" },
            take: 1,
            select: { fecha: true, nivelRuido: true, limitePermitido: true },
          },
          registrosSuelo: {
            orderBy: { fecha: "desc" },
            take: 1,
            select: { fecha: true, ph: true, materiaOrganica: true },
          },
        },
        orderBy: { nombre: "asc" },
      }),
      prisma.pozoSeptico.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
      }),
    ]);

    return {
      puntos: puntos.map(p => ({
        id:           p.id,
        nombre:       p.nombre,
        descripcion:  p.descripcion,
        tipo:         p.tipo,
        latitud:      p.latitud,
        longitud:     p.longitud,
        ultimoHidrico: p.registrosHidricos[0] ?? null,
        ultimoRuido:   p.registrosRuido[0]    ?? null,
        ultimoSuelo:   p.registrosSuelo[0]    ?? null,
      })),
      pozos,
    };
  },

  // ── Registros Hídricos ───────────────────────────────────────────────────

  async getRegistrosHidricos(query: RegistrosHidricosQueryDTO) {
    const where: any = {};
    if (query.puntoId) where.puntoId = query.puntoId;
    const fechaWhere = buildFechaWhere(query.desde, query.hasta);
    if (fechaWhere) where.fecha = fechaWhere;

    const skip = (query.page - 1) * query.limit;
    const [registros, total] = await Promise.all([
      prisma.registroHidrico.findMany({
        where, skip, take: query.limit,
        include: { punto: puntoSelect, usuario: usuarioSelect },
        orderBy: { fecha: "desc" },
      }),
      prisma.registroHidrico.count({ where }),
    ]);
    return {
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      registros,
    };
  },

  async createRegistroHidrico(data: CrearRegistroHidricoDTO, usuarioId: number) {
    const punto = await prisma.puntoMonitoreo.findUnique({ where: { id: data.puntoId } });
    if (!punto || !punto.activo) throw new HttpError("Punto de monitoreo no encontrado o inactivo", 404);

    const registro = await prisma.registroHidrico.create({
      data: {
        puntoId:           data.puntoId,
        fecha:             new Date(data.fecha),
        calidadAgua:       data.calidadAgua,
        ph:                data.ph                ?? null,
        turbidez:          data.turbidez          ?? null,
        conductividad:     data.conductividad     ?? null,
        oxigenoDisuelto:   data.oxigenoDisuelto   ?? null,
        temperatura:       data.temperatura       ?? null,
        coliformesFecales: data.coliformesFecales ?? null,
        observaciones:     data.observaciones     ?? null,
        usuarioId,
      },
      include: { punto: puntoSelect, usuario: usuarioSelect },
    });
    logger.info({ id: registro.id, puntoId: data.puntoId }, "Registro hídrico creado");
    return registro;
  },

  async deleteRegistroHidrico(id: number) {
    const existente = await prisma.registroHidrico.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Registro no encontrado", 404);
    await prisma.registroHidrico.delete({ where: { id } });
    logger.info({ id }, "Registro hídrico eliminado");
  },

  // ── Registros Residuos ───────────────────────────────────────────────────

  async getRegistrosResiduo(query: RegistrosResiduoQueryDTO) {
    const where: any = {};
    if (query.puntoId)     where.puntoId     = query.puntoId;
    if (query.tipoResiduo) where.tipoResiduo = query.tipoResiduo;
    const fechaWhere = buildFechaWhere(query.desde, query.hasta);
    if (fechaWhere) where.fecha = fechaWhere;

    const skip = (query.page - 1) * query.limit;
    const [registros, total] = await Promise.all([
      prisma.registroResiduo.findMany({
        where, skip, take: query.limit,
        include: { punto: puntoSelect, usuario: usuarioSelect },
        orderBy: { fecha: "desc" },
      }),
      prisma.registroResiduo.count({ where }),
    ]);
    return {
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      registros,
    };
  },

  async createRegistroResiduo(data: CrearRegistroResiduoDTO, usuarioId: number) {
    if (data.puntoId) {
      const punto = await prisma.puntoMonitoreo.findUnique({ where: { id: data.puntoId } });
      if (!punto) throw new HttpError("Punto de monitoreo no encontrado", 404);
    }
    const registro = await prisma.registroResiduo.create({
      data: {
        puntoId:       data.puntoId       ?? null,
        fecha:         new Date(data.fecha),
        tipoResiduo:   data.tipoResiduo,
        cantidad:      data.cantidad,
        unidad:        data.unidad,
        disposicion:   data.disposicion,
        empresa:       data.empresa       ?? null,
        manifiestoNum: data.manifiestoNum ?? null,
        observaciones: data.observaciones ?? null,
        usuarioId,
      },
      include: { punto: puntoSelect, usuario: usuarioSelect },
    });
    logger.info({ id: registro.id }, "Registro residuo creado");
    return registro;
  },

  async deleteRegistroResiduo(id: number) {
    const existente = await prisma.registroResiduo.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Registro no encontrado", 404);
    await prisma.registroResiduo.delete({ where: { id } });
    logger.info({ id }, "Registro residuo eliminado");
  },

  // ── Registros Ruido / Emisiones ──────────────────────────────────────────

  async getRegistrosRuido(query: RegistrosRuidoQueryDTO) {
    const where: any = {};
    if (query.puntoId) where.puntoId = query.puntoId;
    const fechaWhere = buildFechaWhere(query.desde, query.hasta);
    if (fechaWhere) where.fecha = fechaWhere;

    const skip = (query.page - 1) * query.limit;
    const [registros, total] = await Promise.all([
      prisma.registroRuido.findMany({
        where, skip, take: query.limit,
        include: { punto: puntoSelect, usuario: usuarioSelect },
        orderBy: { fecha: "desc" },
      }),
      prisma.registroRuido.count({ where }),
    ]);
    return {
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      registros,
    };
  },

  async createRegistroRuido(data: CrearRegistroRuidoDTO, usuarioId: number) {
    const punto = await prisma.puntoMonitoreo.findUnique({ where: { id: data.puntoId } });
    if (!punto || !punto.activo) throw new HttpError("Punto de monitoreo no encontrado o inactivo", 404);

    const registro = await prisma.registroRuido.create({
      data: {
        puntoId:         data.puntoId,
        fecha:           new Date(data.fecha),
        nivelRuido:      data.nivelRuido,
        limitePermitido: data.limitePermitido ?? null,
        particulasPm10:  data.particulasPm10  ?? null,
        particulasPm25:  data.particulasPm25  ?? null,
        observaciones:   data.observaciones   ?? null,
        usuarioId,
      },
      include: { punto: puntoSelect, usuario: usuarioSelect },
    });
    logger.info({ id: registro.id, puntoId: data.puntoId }, "Registro ruido creado");
    return registro;
  },

  async deleteRegistroRuido(id: number) {
    const existente = await prisma.registroRuido.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Registro no encontrado", 404);
    await prisma.registroRuido.delete({ where: { id } });
    logger.info({ id }, "Registro ruido eliminado");
  },

  // ── Registros Suelo / Biodiversidad ─────────────────────────────────────

  async getRegistrosSuelo(query: RegistrosSueloQueryDTO) {
    const where: any = {};
    if (query.puntoId) where.puntoId = query.puntoId;
    const fechaWhere = buildFechaWhere(query.desde, query.hasta);
    if (fechaWhere) where.fecha = fechaWhere;

    const skip = (query.page - 1) * query.limit;
    const [registros, total] = await Promise.all([
      prisma.registroSuelo.findMany({
        where, skip, take: query.limit,
        include: { punto: puntoSelect, usuario: usuarioSelect },
        orderBy: { fecha: "desc" },
      }),
      prisma.registroSuelo.count({ where }),
    ]);
    return {
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      registros,
    };
  },

  async createRegistroSuelo(data: CrearRegistroSueloDTO, usuarioId: number) {
    const punto = await prisma.puntoMonitoreo.findUnique({ where: { id: data.puntoId } });
    if (!punto || !punto.activo) throw new HttpError("Punto de monitoreo no encontrado o inactivo", 404);

    const registro = await prisma.registroSuelo.create({
      data: {
        puntoId:             data.puntoId,
        fecha:               new Date(data.fecha),
        ph:                  data.ph                  ?? null,
        conductividad:       data.conductividad       ?? null,
        materiaOrganica:     data.materiaOrganica     ?? null,
        especiesRegistradas: data.especiesRegistradas ?? null,
        observaciones:       data.observaciones       ?? null,
        usuarioId,
      },
      include: { punto: puntoSelect, usuario: usuarioSelect },
    });
    logger.info({ id: registro.id, puntoId: data.puntoId }, "Registro suelo creado");
    return registro;
  },

  async deleteRegistroSuelo(id: number) {
    const existente = await prisma.registroSuelo.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Registro no encontrado", 404);
    await prisma.registroSuelo.delete({ where: { id } });
    logger.info({ id }, "Registro suelo eliminado");
  },

  // ── Pozos Sépticos ───────────────────────────────────────────────────────

  async getPozos(query: PozosQueryDTO) {
    const pozos = await prisma.pozoSeptico.findMany({
      where: { activo: query.activo },
      orderBy: { nombre: "asc" },
    });
    return { total: pozos.length, pozos };
  },

  async createPozo(data: CrearPozoDTO) {
    const pozo = await prisma.pozoSeptico.create({
      data: {
        nombre:          data.nombre,
        descripcion:     data.descripcion     ?? null,
        latitud:         data.latitud,
        longitud:        data.longitud,
        capacidadM3:     data.capacidadM3     ?? null,
        estado:          data.estado,
        ultimaLimpieza:  data.ultimaLimpieza  ? new Date(data.ultimaLimpieza)  : null,
        proximaLimpieza: data.proximaLimpieza ? new Date(data.proximaLimpieza) : null,
        observaciones:   data.observaciones   ?? null,
      },
    });
    logger.info({ id: pozo.id }, "Pozo séptico creado");
    return pozo;
  },

  async updatePozo(id: number, data: ActualizarPozoDTO) {
    const existente = await prisma.pozoSeptico.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Pozo séptico no encontrado", 404);

    const updates: Record<string, unknown> = {};
    if (data.nombre          !== undefined) updates.nombre          = data.nombre;
    if (data.descripcion     !== undefined) updates.descripcion     = data.descripcion;
    if (data.latitud         !== undefined) updates.latitud         = data.latitud;
    if (data.longitud        !== undefined) updates.longitud        = data.longitud;
    if (data.capacidadM3     !== undefined) updates.capacidadM3     = data.capacidadM3;
    if (data.estado          !== undefined) updates.estado          = data.estado;
    if (data.observaciones   !== undefined) updates.observaciones   = data.observaciones;
    if (data.activo          !== undefined) updates.activo          = data.activo;
    if (data.ultimaLimpieza  !== undefined) updates.ultimaLimpieza  = new Date(data.ultimaLimpieza);
    if (data.proximaLimpieza !== undefined) updates.proximaLimpieza = new Date(data.proximaLimpieza);

    const actualizado = await prisma.pozoSeptico.update({ where: { id }, data: updates });
    logger.info({ id }, "Pozo séptico actualizado");
    return actualizado;
  },

  async deletePozo(id: number) {
    const existente = await prisma.pozoSeptico.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Pozo séptico no encontrado", 404);
    await prisma.pozoSeptico.update({ where: { id }, data: { activo: false } });
    logger.info({ id }, "Pozo séptico desactivado");
  },

  // ── Manifiestos Ambientales ──────────────────────────────────────────────

  async getManifiestos(query: ManifiestoQueryDTO) {
    const where: any = {};
    if (query.anio) where.anio = query.anio;
    const manifiestos = await prisma.manifiestoAmbiental.findMany({
      where,
      include: { usuario: usuarioSelect },
      orderBy: [{ anio: "desc" }, { createdAt: "desc" }],
    });
    return { total: manifiestos.length, manifiestos };
  },

  async createManifiesto(data: CrearManifiestoDTO, usuarioId: number) {
    const manifiesto = await prisma.manifiestoAmbiental.create({
      data: {
        anio:        data.anio,
        titulo:      data.titulo,
        descripcion: data.descripcion ?? null,
        objetivos:   data.objetivos   ?? null,
        compromisos: data.compromisos ?? null,
        responsable: data.responsable ?? null,
        aprobadoAt:  data.aprobadoAt  ? new Date(data.aprobadoAt) : null,
        usuarioId,
      },
      include: { usuario: usuarioSelect },
    });
    logger.info({ id: manifiesto.id, anio: data.anio }, "Manifiesto ambiental creado");
    return manifiesto;
  },

  async updateManifiesto(id: number, data: ActualizarManifiestoDTO) {
    const existente = await prisma.manifiestoAmbiental.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Manifiesto no encontrado", 404);

    const updates: Record<string, unknown> = {};
    if (data.titulo      !== undefined) updates.titulo      = data.titulo;
    if (data.descripcion !== undefined) updates.descripcion = data.descripcion;
    if (data.objetivos   !== undefined) updates.objetivos   = data.objetivos;
    if (data.compromisos !== undefined) updates.compromisos = data.compromisos;
    if (data.responsable !== undefined) updates.responsable = data.responsable;
    if (data.aprobadoAt  !== undefined) updates.aprobadoAt  = new Date(data.aprobadoAt);

    const actualizado = await prisma.manifiestoAmbiental.update({
      where: { id },
      data:  updates,
      include: { usuario: usuarioSelect },
    });
    logger.info({ id }, "Manifiesto ambiental actualizado");
    return actualizado;
  },

  async deleteManifiesto(id: number) {
    const existente = await prisma.manifiestoAmbiental.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Manifiesto no encontrado", 404);
    await prisma.manifiestoAmbiental.delete({ where: { id } });
    logger.info({ id }, "Manifiesto ambiental eliminado");
  },

  // ── Dashboard ────────────────────────────────────────────────────────────

  async getDashboard() {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const [
      puntosActivos,
      totalPuntos,
      pozosCriticos,
      totalPozos,
      totalRegistrosHidricos,
      ultimosHidricos,
      residuos30d,
    ] = await Promise.all([
      prisma.puntoMonitoreo.count({ where: { activo: true } }),
      prisma.puntoMonitoreo.count(),
      prisma.pozoSeptico.count({ where: { activo: true, estado: { in: ["MALO", "CRITICO"] } } }),
      prisma.pozoSeptico.count({ where: { activo: true } }),
      prisma.registroHidrico.count(),
      prisma.registroHidrico.findMany({
        where: { fecha: { gte: hace30Dias } },
        include: { punto: puntoSelect, usuario: usuarioSelect },
        orderBy: { fecha: "desc" },
        take: 5,
      }),
      prisma.registroResiduo.count({ where: { fecha: { gte: hace30Dias } } }),
    ]);

    return {
      resumen: {
        puntosActivos,
        totalPuntos,
        pozosCriticos,
        totalPozos,
        totalRegistrosHidricos,
        residuosUltimos30Dias: residuos30d,
      },
      ultimosRegistrosHidricos: ultimosHidricos,
    };
  },
};
