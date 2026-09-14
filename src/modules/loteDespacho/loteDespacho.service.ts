import { prisma } from "../../config/prisma.js";
import { generarCorrelativoLote } from "../../utils/correlativo.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import type {
  AnularLoteDTO,
  AvanzarEstadoLoteDTO,
  CreateLoteDespachoDTO,
  RegistrarPesajeDTO,
  RegularizarFormulario101DTO,
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
  pesaje: true,
  anulacion: true,
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
    if (query.estadoFormulario101) where.estadoFormulario101 = query.estadoFormulario101;
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
          codigoFormulario101: data.codigoFormulario101 ?? null,
          estadoFormulario101: data.codigoFormulario101 ? "REGULARIZADO" : "PENDIENTE",
          estadoLote: "REGISTRADO",
          usuarioRegistroId: userId,
          conocimientoCarga: {
            create: {
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

  async regularizarFormulario101(id: string, data: RegularizarFormulario101DTO, userId: number) {
    const lote = await prisma.loteDespacho.findUnique({ where: { id } });
    if (!lote) throw new HttpError("Lote no encontrado", 404);
    if (lote.estadoLote === "ANULADO") throw new HttpError("El lote está anulado", 409);
    if (lote.estadoFormulario101 === "REGULARIZADO") {
      throw new HttpError("El Formulario 101 ya fue regularizado", 409);
    }

    const actualizado = await prisma.loteDespacho.update({
      where: { id },
      data: { codigoFormulario101: data.codigoFormulario101, estadoFormulario101: "REGULARIZADO" },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "REGULARIZAR_F101_LOTE",
        data: { loteId: id, codigoFormulario101: data.codigoFormulario101 },
      },
    });

    logger.info({ userId, loteId: id, action: "REGULARIZAR_F101_LOTE" }, "Formulario 101 regularizado");

    return actualizado;
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

  async anular(id: string, data: AnularLoteDTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const lote = await tx.loteDespacho.findUnique({ where: { id } });
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

      await tx.log.create({
        data: { usuarioId: userId, accion: "ANULAR_LOTE", data: { loteId: id, motivo: data.motivo } },
      });

      return actualizado;
    });
  },
};
