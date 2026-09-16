import { prisma } from "../../config/prisma.js";
import { generarCorrelativoLote } from "../../utils/correlativo.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  AnularLoteDTO,
  AvanzarEstadoLoteDTO,
  CreateLoteDespachoDTO,
  RegistrarPesajeDTO,
  TransbordarLoteDTO,
} from "./loteDespacho.types.js";
import type { z } from "zod";
import type { loteDespachoQuerySchema } from "./loteDespacho.schema.js";

type LoteDespachoQuery = z.infer<typeof loteDespachoQuerySchema>;

const INCLUDE_DETALLE = {
  municipioOrigen: true,
  remitente: true,
  vehiculo: true,
  chofer: true,
  tipoMineral: true,
  destinoIngenio: true,
  conocimientoCarga: true,
  formulario101: { include: { anulacion: true } },
  pesaje: true,
  anulacion: true,
  transbordos: { include: { vehiculoOriginal: true, vehiculoNuevo: true, choferNuevo: true } },
} as const;

// Transiciones manuales permitidas del lote (paperwork). PESADO/ACOPIADO se
// alcanzan automáticamente al registrar el pesaje, nunca por esta vía.
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  REGISTRADO: ["EN_TRANSITO"],
  EN_TRANSITO: ["EN_BALANZA"],
};

export const loteDespachoService = {
  async getAll(query: LoteDespachoQuery) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.estadoLote) where.estadoLote = query.estadoLote;
    if (query.municipioOrigenId) where.municipioOrigenId = query.municipioOrigenId;
    if (query.remitenteId) where.remitenteId = query.remitenteId;
    if (query.fechaInicio || query.fechaFin) {
      where.fechaDespachoReal = {};
      if (query.fechaInicio) where.fechaDespachoReal.gte = query.fechaInicio;
      if (query.fechaFin) where.fechaDespachoReal.lte = query.fechaFin;
    }

    const [lotes, total] = await Promise.all([
      prisma.loteDespacho.findMany({
        where,
        skip,
        take: limit,
        include: {
          municipioOrigen: true,
          remitente: true,
          vehiculo: true,
          tipoMineral: true,
          destinoIngenio: true,
          formulario101: true,
          pesaje: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.loteDespacho.count({ where }),
    ]);

    return { lotes, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id: string) {
    return prisma.loteDespacho.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  },

  async create(data: CreateLoteDespachoDTO, userId: number) {
    const [municipio, remitente, vehiculo, chofer, tipoMineral, ingenio] = await Promise.all([
      prisma.municipioOrigen.findUnique({ where: { id: data.municipioOrigenId } }),
      prisma.remitente.findUnique({ where: { id: data.remitenteId } }),
      prisma.vehiculo.findUnique({ where: { id: data.vehiculoId } }),
      prisma.chofer.findUnique({ where: { id: data.choferId } }),
      prisma.tipoMineral.findUnique({ where: { id: data.tipoMineralId } }),
      prisma.ingenio.findUnique({ where: { id: data.destinoIngenioId } }),
    ]);

    if (!municipio) throw new HttpError("Municipio de origen no encontrado", 404);
    if (!remitente) throw new HttpError("Remitente no encontrado", 404);
    if (!vehiculo) throw new HttpError("Vehículo no encontrado", 404);
    if (!chofer) throw new HttpError("Chofer no encontrado", 404);
    if (!tipoMineral) throw new HttpError("Tipo de mineral no encontrado", 404);
    if (!ingenio) throw new HttpError("Ingenio destino no encontrado", 404);

    if (vehiculo.estadoActual !== "DISPONIBLE") {
      throw new HttpError(
        `El vehículo ${vehiculo.placa} no está disponible (estado actual: ${vehiculo.estadoActual})`,
        409,
      );
    }

    const lote = await prisma.$transaction(async (tx) => {
      const correlativo = await generarCorrelativoLote(tx, data.fechaDespachoReal);

      const creado = await tx.loteDespacho.create({
        data: {
          correlativo,
          municipioOrigenId: data.municipioOrigenId,
          remitenteId: data.remitenteId,
          vehiculoId: data.vehiculoId,
          choferId: data.choferId,
          tipoMineralId: data.tipoMineralId,
          destinoIngenioId: data.destinoIngenioId,
          nivel: data.nivel ?? null,
          fechaDespachoReal: data.fechaDespachoReal,
          fechaDocumentalFiscal: data.fechaDocumentalFiscal ?? data.fechaDespachoReal,
          estadoLote: "REGISTRADO",
          usuarioRegistroId: userId,
          conocimientoCarga: {
            create: {
              fecha: data.conocimientoFecha ?? data.fechaDespachoReal,
              detalleCarga: data.detalleCarga ?? "Carga Chami",
              descripcion: data.descripcion ?? null,
              observaciones: data.observaciones ?? null,
              copiasEmitidas: { ingenio: true, chofer: true, empresa: true },
            },
          },
        },
        include: INCLUDE_DETALLE,
      });

      await tx.vehiculo.update({ where: { id: data.vehiculoId }, data: { estadoActual: "EN_TRANSITO" } });
      await tx.estadoFlotaHistorico.create({
        data: {
          vehiculoId: data.vehiculoId,
          estado: "EN_TRANSITO",
          motivo: `Despacho del lote ${creado.correlativo}`,
          origenCambio: "MANUAL",
          usuarioId: userId,
        },
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_LOTE_DESPACHO",
          data: { loteId: creado.id, correlativo },
        },
      });

      return creado;
    });

    logger.info(
      { userId, loteId: lote.id, correlativo: lote.correlativo, action: "CREATE_LOTE_DESPACHO" },
      "Lote de despacho creado",
    );

    return lote;
  },

  // Transición manual del lote — sincroniza el tablero de flota del
  // vehículo para que el asistente no tenga que actualizar ambos por separado.
  async avanzarEstado(id: string, data: AvanzarEstadoLoteDTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const lote = await tx.loteDespacho.findUnique({ where: { id } });
      if (!lote) throw new HttpError("Lote no encontrado", 404);
      if (lote.estadoLote === "ANULADO") throw new HttpError("El lote está anulado", 409);

      const permitidos = TRANSICIONES_VALIDAS[lote.estadoLote] ?? [];
      if (!permitidos.includes(data.estado)) {
        throw new HttpError(`No se puede pasar de ${lote.estadoLote} a ${data.estado}`, 409);
      }

      const actualizado = await tx.loteDespacho.update({
        where: { id },
        data: { estadoLote: data.estado },
      });

      await tx.vehiculo.update({ where: { id: lote.vehiculoId }, data: { estadoActual: data.estado } });
      await tx.estadoFlotaHistorico.create({
        data: {
          vehiculoId: lote.vehiculoId,
          estado: data.estado,
          motivo: `Sincronizado con el lote ${lote.correlativo}`,
          origenCambio: "MANUAL",
          usuarioId: userId,
        },
      });

      await tx.log.create({
        data: { usuarioId: userId, accion: "AVANZAR_ESTADO_LOTE", data: { loteId: id, estado: data.estado } },
      });

      return actualizado;
    });
  },

  // El neto siempre se calcula en el service (nunca columna generada en
  // DB), igual que stockDespues/saldoBs en vales.service.ts. Al pesar, el
  // lote pasa directo a ACOPIADO (la ley del mineral ya se confirmó al
  // pesar) y el vehículo vuelve a estar DISPONIBLE.
  async registrarPesaje(id: string, data: RegistrarPesajeDTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const lote = await tx.loteDespacho.findUnique({ where: { id }, include: { pesaje: true } });
      if (!lote) throw new HttpError("Lote no encontrado", 404);
      if (lote.estadoLote === "ANULADO") throw new HttpError("El lote está anulado", 409);
      if (lote.pesaje) throw new HttpError("El lote ya tiene un pesaje registrado", 409);
      if (lote.estadoLote !== "EN_BALANZA") {
        throw new HttpError("El lote debe estar en balanza para registrar el pesaje", 409);
      }

      const tonelajeNeto = data.tonelajeBruto - data.tonelajeTara;

      await tx.pesajeIngenio.create({
        data: {
          loteId: id,
          tonelajeBruto: data.tonelajeBruto,
          tonelajeTara: data.tonelajeTara,
          tonelajeNeto,
          observaciones: data.observaciones ?? null,
          usuarioId: userId,
        },
      });

      const actualizado = await tx.loteDespacho.update({
        where: { id },
        data: { estadoLote: "ACOPIADO" },
      });

      await tx.vehiculo.update({ where: { id: lote.vehiculoId }, data: { estadoActual: "DISPONIBLE" } });
      await tx.estadoFlotaHistorico.create({
        data: {
          vehiculoId: lote.vehiculoId,
          estado: "DISPONIBLE",
          motivo: `Pesaje concluido del lote ${lote.correlativo}`,
          origenCambio: "MANUAL",
          usuarioId: userId,
        },
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "REGISTRAR_PESAJE_LOTE",
          data: {
            loteId: id,
            tonelajeBruto: data.tonelajeBruto,
            tonelajeTara: data.tonelajeTara,
            tonelajeNeto,
          },
        },
      });

      return actualizado;
    });
  },

  // Anular el lote NO anula su Formulario 101 (el papel del Municipio
  // sigue siendo válido): si tenía uno vinculado, se libera (queda
  // DISPONIBLE) para poder reutilizarlo en otro lote — es el camino
  // contrario a anularFormulario101(), que si arrastra al lote consigo.
  async anular(id: string, data: AnularLoteDTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const lote = await tx.loteDespacho.findUnique({ where: { id }, include: { formulario101: true, pesaje: true } });
      if (!lote) throw new HttpError("Lote no encontrado", 404);
      if (lote.estadoLote === "ANULADO") throw new HttpError("El lote ya está anulado", 409);
      if (lote.estadoLote === "LIQUIDADO") {
        throw new HttpError("No se puede anular un lote ya liquidado", 409);
      }

      const actualizado = await tx.loteDespacho.update({
        where: { id },
        data: { estadoLote: "ANULADO" },
      });

      await tx.anulacionLote.create({
        data: { loteId: id, usuarioId: userId, motivo: data.motivo },
      });

      if (lote.formulario101 && lote.formulario101.estado === "VINCULADO") {
        await tx.formulario101.update({
          where: { id: lote.formulario101.id },
          data: { loteId: null, estado: "DISPONIBLE" },
        });
      }

      // Si el viaje no llegó a pesarse, su vehículo sigue "ocupado" con este
      // lote (EN_TRANSITO/EN_BALANZA desde que se creó) — al anular, queda
      // libre de nuevo, o si no podrá volver a asignarse a ningún otro lote.
      if (!lote.pesaje) {
        await tx.vehiculo.update({ where: { id: lote.vehiculoId }, data: { estadoActual: "DISPONIBLE" } });
        await tx.estadoFlotaHistorico.create({
          data: {
            vehiculoId: lote.vehiculoId,
            estado: "DISPONIBLE",
            motivo: `Lote ${lote.correlativo} anulado: ${data.motivo}`,
            origenCambio: "MANUAL",
            usuarioId: userId,
          },
        });
      }

      await tx.log.create({
        data: { usuarioId: userId, accion: "ANULAR_LOTE", data: { loteId: id, motivo: data.motivo } },
      });

      return actualizado;
    });
  },

  // Transbordo: la volqueta original sufre una falla mecánica a mitad de
  // camino y otra completa el traslado — sigue siendo el MISMO lote
  // (mismo Conocimiento, mismo Formulario 101), solo cambia el vehículo/
  // chofer desde este punto en adelante. El vehículo original pasa a
  // CON_FALLA_MECANICA, el nuevo a EN_TRANSITO.
  async transbordar(id: string, data: TransbordarLoteDTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const lote = await tx.loteDespacho.findUnique({ where: { id } });
      if (!lote) throw new HttpError("Lote no encontrado", 404);
      if (lote.estadoLote === "ANULADO") throw new HttpError("El lote está anulado", 409);
      if (lote.estadoLote !== "EN_TRANSITO") {
        throw new HttpError("Solo se puede transbordar un lote que está en tránsito", 409);
      }
      if (data.vehiculoNuevoId === lote.vehiculoId) {
        throw new HttpError("El vehículo nuevo debe ser distinto al original", 400);
      }

      const vehiculoNuevo = await tx.vehiculo.findUnique({ where: { id: data.vehiculoNuevoId } });
      if (!vehiculoNuevo) throw new HttpError("Vehículo nuevo no encontrado", 404);
      if (vehiculoNuevo.estadoActual !== "DISPONIBLE") {
        throw new HttpError(`El vehículo ${vehiculoNuevo.placa} no está disponible`, 409);
      }

      if (data.choferNuevoId) {
        const choferNuevo = await tx.chofer.findUnique({ where: { id: data.choferNuevoId } });
        if (!choferNuevo) throw new HttpError("Chofer nuevo no encontrado", 404);
      }

      await tx.transbordoLote.create({
        data: {
          loteId: id,
          vehiculoOriginalId: lote.vehiculoId,
          vehiculoNuevoId: data.vehiculoNuevoId,
          choferNuevoId: data.choferNuevoId ?? null,
          motivo: data.motivo,
          usuarioId: userId,
        },
      });

      const actualizado = await tx.loteDespacho.update({
        where: { id },
        data: {
          vehiculoId: data.vehiculoNuevoId,
          choferId: data.choferNuevoId ?? lote.choferId,
        },
      });

      await tx.vehiculo.update({ where: { id: lote.vehiculoId }, data: { estadoActual: "CON_FALLA_MECANICA" } });
      await tx.estadoFlotaHistorico.create({
        data: {
          vehiculoId: lote.vehiculoId,
          estado: "CON_FALLA_MECANICA",
          motivo: `Transbordo del lote ${lote.correlativo}: ${data.motivo}`,
          origenCambio: "MANUAL",
          usuarioId: userId,
        },
      });

      await tx.vehiculo.update({ where: { id: data.vehiculoNuevoId }, data: { estadoActual: "EN_TRANSITO" } });
      await tx.estadoFlotaHistorico.create({
        data: {
          vehiculoId: data.vehiculoNuevoId,
          estado: "EN_TRANSITO",
          motivo: `Transbordo del lote ${lote.correlativo}: completa el traslado`,
          origenCambio: "MANUAL",
          usuarioId: userId,
        },
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "TRANSBORDO_LOTE",
          data: { loteId: id, vehiculoOriginalId: lote.vehiculoId, vehiculoNuevoId: data.vehiculoNuevoId, motivo: data.motivo },
        },
      });

      return tx.loteDespacho.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });
  },
};
