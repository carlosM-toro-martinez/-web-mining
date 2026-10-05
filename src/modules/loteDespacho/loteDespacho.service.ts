import { prisma } from "../../config/prisma.js";
import {
  asignarCorrelativoLoteManual,
  correlativoLiberadoDeLoteAnulado,
  generarCorrelativoLote,
} from "../../utils/correlativo.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { parseCuadroEnvioExcel } from "./loteDespachoImport.parser.js";
import type {
  AnularLoteDTO,
  AvanzarEstadoLoteDTO,
  CreateLoteDespachoDTO,
  FilaImportLoteResultado,
  RegistrarCombustibleEntregadoDTO,
  RegistrarPesajeDTO,
  ResultadoImportacionLotes,
  TransbordarLoteDTO,
  UpdateLoteDespachoDTO,
} from "./loteDespacho.types.js";
import type { z } from "zod";
import type { loteDespachoQuerySchema } from "./loteDespacho.schema.js";

type LoteDespachoQuery = z.infer<typeof loteDespachoQuerySchema>;

const INCLUDE_DETALLE = {
  municipioOrigen: true,
  transportista: true,
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

// Neto del pesaje con 3 decimales: el que escribió el usuario si lo corrigió
// a mano (el ticket de balanza a veces difiere en algún decimal), o si no
// bruto − tara. Se redondea explícitamente porque restar en coma flotante
// deja restos como 19.719999999999999.
function netoDelPesaje(bruto: number, tara: number, netoManual?: number): number {
  return Math.round((netoManual ?? bruto - tara) * 1000) / 1000;
}

export const loteDespachoService = {
  async getAll(query: LoteDespachoQuery) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.estadoLote) where.estadoLote = query.estadoLote;
    if (query.municipioOrigenId) where.municipioOrigenId = query.municipioOrigenId;
    if (query.transportistaId) where.transportistaId = query.transportistaId;
    if (query.vehiculoId) where.vehiculoId = query.vehiculoId;
    if (query.fechaInicio || query.fechaFin) {
      where.fechaDespachoReal = {};
      if (query.fechaInicio) where.fechaDespachoReal.gte = query.fechaInicio;
      if (query.fechaFin) where.fechaDespachoReal.lte = query.fechaFin;
    }
    if (query.search) {
      const texto = query.search;
      where.OR = [
        { correlativo: { contains: texto, mode: "insensitive" as const } },
        { transportista: { nombreORazonSocial: { contains: texto, mode: "insensitive" as const } } },
        { vehiculo: { placa: { contains: texto, mode: "insensitive" as const } } },
        { formulario101: { codigo: { contains: texto, mode: "insensitive" as const } } },
      ];
    }
    if (query.conObservaciones) {
      where.conocimientoCarga = { AND: [{ observaciones: { not: null } }, { observaciones: { not: "" } }] };
    }

    const [lotes, total] = await Promise.all([
      prisma.loteDespacho.findMany({
        where,
        skip,
        take: limit,
        include: {
          municipioOrigen: true,
          transportista: true,
          vehiculo: true,
          // El chofer va en el Conocimiento, que se imprime directo desde la fila.
          chofer: true,
          tipoMineral: true,
          destinoIngenio: true,
          formulario101: true,
          pesaje: true,
          conocimientoCarga: true,
        },
        // Más reciente primero por fecha de despacho real; createdAt desc
        // como desempate entre lotes del mismo día — como el correlativo
        // (número de conocimiento) es un contador que sube con el tiempo,
        // dentro de un mismo día el que se creó/importó después también es
        // el de número más alto, así que esto deja arriba el conocimiento
        // más reciente sin tener que parsear el string del correlativo.
        orderBy: [{ fechaDespachoReal: "desc" }, { createdAt: "desc" }],
      }),
      prisma.loteDespacho.count({ where }),
    ]);

    return { lotes, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id: string) {
    return prisma.loteDespacho.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  },

  // Edición de un lote ya creado — para corregir datos mal cargados (a mano
  // o por una importación masiva), no para repetir el flujo de creación.
  // El correlativo se puede corregir a mano (numeroCorrelativo); si cambia
  // el mes de la fecha de despacho, el lote pasa a la serie de ese mes
  // con el siguiente número libre. No se permite editar un
  // lote ANULADO ni LIQUIDADO (ese ya quedó "cerrado"). Si vienen
  // tonelajeBruto/tonelajeTara, solo se aplican cuando el lote YA tiene un
  // pesaje registrado (recalcula el neto); si no lo tiene, se ignoran acá
  // — para eso está "Registrar pesaje".
  async update(id: string, data: UpdateLoteDespachoDTO, userId: number) {
    const existente = await prisma.loteDespacho.findUnique({ where: { id }, include: { pesaje: true } });
    if (!existente) throw new HttpError("Lote no encontrado", 404);
    if (existente.estadoLote === "ANULADO") throw new HttpError("No se puede editar un lote anulado", 409);
    if (existente.estadoLote === "LIQUIDADO") {
      throw new HttpError("No se puede editar un lote ya liquidado", 409);
    }

    const [municipio, transportista, vehiculo, chofer, tipoMineral, ingenio] = await Promise.all([
      data.municipioOrigenId ? prisma.municipioOrigen.findUnique({ where: { id: data.municipioOrigenId } }) : null,
      data.transportistaId ? prisma.transportista.findUnique({ where: { id: data.transportistaId } }) : null,
      data.vehiculoId ? prisma.vehiculo.findUnique({ where: { id: data.vehiculoId } }) : null,
      data.choferId ? prisma.chofer.findUnique({ where: { id: data.choferId } }) : null,
      data.tipoMineralId ? prisma.tipoMineral.findUnique({ where: { id: data.tipoMineralId } }) : null,
      data.destinoIngenioId ? prisma.ingenio.findUnique({ where: { id: data.destinoIngenioId } }) : null,
    ]);
    if (data.municipioOrigenId && !municipio) throw new HttpError("Municipio de origen no encontrado", 404);
    if (data.transportistaId && !transportista) throw new HttpError("Transportista no encontrado", 404);
    if (data.vehiculoId && !vehiculo) throw new HttpError("Vehículo no encontrado", 404);
    if (data.choferId && !chofer) throw new HttpError("Chofer no encontrado", 404);
    if (data.tipoMineralId && !tipoMineral) throw new HttpError("Tipo de mineral no encontrado", 404);
    if (data.destinoIngenioId && !ingenio) throw new HttpError("Ingenio destino no encontrado", 404);

    const incluyeCombustible = data.incluyeCombustible ?? existente.incluyeCombustible;
    const combustibleAsignadoLitros =
      incluyeCombustible === "SIN_COMBUSTIBLE"
        ? null
        : data.combustibleAsignadoLitros !== undefined
          ? data.combustibleAsignadoLitros
          : existente.combustibleAsignadoLitros;

    const {
      tonelajeBruto,
      tonelajeTara,
      tonelajeNeto,
      detalleCarga,
      descripcion,
      observaciones,
      numeroCorrelativo,
      ...camposLote
    } = data;

    const loteData: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(camposLote)) {
      if (valor !== undefined) loteData[clave] = valor;
    }
    loteData.incluyeCombustible = incluyeCombustible;
    loteData.combustibleAsignadoLitros = combustibleAsignadoLitros;

    const fechaNueva = data.fechaDespachoReal ?? existente.fechaDespachoReal;
    const cambiaDeMes =
      fechaNueva.getUTCFullYear() !== existente.fechaDespachoReal.getUTCFullYear() ||
      fechaNueva.getUTCMonth() !== existente.fechaDespachoReal.getUTCMonth();

    const lote = await prisma.$transaction(async (tx) => {
      if (numeroCorrelativo !== undefined) {
        Object.assign(loteData, await asignarCorrelativoLoteManual(tx, id, numeroCorrelativo, fechaNueva));
      } else if (cambiaDeMes) {
        Object.assign(loteData, await generarCorrelativoLote(tx, fechaNueva, id));
      }

      const actualizado = await tx.loteDespacho.update({ where: { id }, data: loteData });

      if (detalleCarga !== undefined || descripcion !== undefined || observaciones !== undefined) {
        await tx.conocimientoCarga.update({
          where: { loteId: id },
          data: {
            ...(detalleCarga !== undefined ? { detalleCarga } : {}),
            ...(descripcion !== undefined ? { descripcion } : {}),
            ...(observaciones !== undefined ? { observaciones } : {}),
          },
        });
      }

      if (existente.pesaje && (tonelajeBruto !== undefined || tonelajeTara !== undefined || tonelajeNeto !== undefined)) {
        const bruto = tonelajeBruto ?? Number(existente.pesaje.tonelajeBruto);
        const tara = tonelajeTara ?? Number(existente.pesaje.tonelajeTara);
        if (bruto <= tara) {
          throw new HttpError("El tonelaje bruto debe ser mayor al tara", 400);
        }
        await tx.pesajeIngenio.update({
          where: { loteId: id },
          data: { tonelajeBruto: bruto, tonelajeTara: tara, tonelajeNeto: netoDelPesaje(bruto, tara, tonelajeNeto) },
        });
      }

      await tx.log.create({
        data: { usuarioId: userId, accion: "UPDATE_LOTE_DESPACHO", data: { loteId: id, ...data } },
      });

      return actualizado;
    });

    logger.info({ userId, loteId: id, action: "UPDATE_LOTE_DESPACHO" }, "Lote de despacho editado");

    return prisma.loteDespacho.findUniqueOrThrow({ where: { id: lote.id }, include: INCLUDE_DETALLE });
  },

  async create(data: CreateLoteDespachoDTO, userId: number) {
    const [municipio, transportista, vehiculo, chofer, tipoMineral, ingenio] = await Promise.all([
      prisma.municipioOrigen.findUnique({ where: { id: data.municipioOrigenId } }),
      prisma.transportista.findUnique({ where: { id: data.transportistaId } }),
      prisma.vehiculo.findUnique({ where: { id: data.vehiculoId } }),
      prisma.chofer.findUnique({ where: { id: data.choferId } }),
      prisma.tipoMineral.findUnique({ where: { id: data.tipoMineralId } }),
      prisma.ingenio.findUnique({ where: { id: data.destinoIngenioId } }),
    ]);

    if (!municipio) throw new HttpError("Municipio de origen no encontrado", 404);
    if (!transportista) throw new HttpError("Transportista no encontrado", 404);
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
      const { correlativo, anio } = await generarCorrelativoLote(tx, data.fechaDespachoReal);

      const creado = await tx.loteDespacho.create({
        data: {
          correlativo,
          anio,
          municipioOrigenId: data.municipioOrigenId,
          transportistaId: data.transportistaId,
          vehiculoId: data.vehiculoId,
          choferId: data.choferId,
          tipoMineralId: data.tipoMineralId,
          destinoIngenioId: data.destinoIngenioId,
          nivel: data.nivel ?? null,
          incluyeCombustible: data.incluyeCombustible,
          combustibleAsignadoLitros:
            data.incluyeCombustible === "CON_COMBUSTIBLE" ? data.combustibleAsignadoLitros ?? null : null,
          fechaDespachoReal: data.fechaDespachoReal,
          fechaDocumentalFiscal: data.fechaDocumentalFiscal ?? data.fechaDespachoReal,
          // El vehículo ya se marca EN_TRANSITO abajo en el mismo paso — el
          // lote arranca en el mismo estado, no en REGISTRADO. Antes quedaba
          // "REGISTRADO" y había que hacer un clic extra y redundante para
          // "Marcar en tránsito" un lote que el tablero ya mostraba en
          // tránsito desde el momento de crearlo.
          estadoLote: "EN_TRANSITO",
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

  // El neto se calcula en el service (nunca columna generada en DB) salvo
  // que el usuario lo corrija a mano (ver netoDelPesaje). Al pesar, el
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

      const tonelajeNeto = netoDelPesaje(data.tonelajeBruto, data.tonelajeTara, data.tonelajeNeto);

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

      // No pasa a DISPONIBLE directo: entregó y se pesó, pero todavía tiene
      // que volver físicamente al punto de origen. Queda "En retorno" hasta
      // que alguien confirme a mano que ya llegó (ver cambiarEstadoVehiculo).
      await tx.vehiculo.update({ where: { id: lote.vehiculoId }, data: { estadoActual: "EN_RETORNO" } });
      await tx.estadoFlotaHistorico.create({
        data: {
          vehiculoId: lote.vehiculoId,
          estado: "EN_RETORNO",
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

  // Cuánto combustible se le entregó REALMENTE al vehículo, aparte de lo
  // que se le asignó al crear el lote (combustibleAsignadoLitros) — no
  // siempre coincide (puede quedar un sobrante), así que se registra por
  // separado y una sola vez, apenas se sepa la cifra real. Se puede
  // registrar en cualquier momento mientras el lote no esté anulado — a
  // diferencia del pesaje, no depende de en qué estado esté el lote.
  async registrarCombustibleEntregado(id: string, data: RegistrarCombustibleEntregadoDTO, userId: number) {
    const lote = await prisma.loteDespacho.findUnique({ where: { id } });
    if (!lote) throw new HttpError("Lote no encontrado", 404);
    if (lote.estadoLote === "ANULADO") throw new HttpError("El lote está anulado", 409);
    if (lote.incluyeCombustible !== "CON_COMBUSTIBLE") {
      throw new HttpError("Este lote no lleva combustible de la empresa asignado", 409);
    }
    if (lote.combustibleEntregadoLitros !== null) {
      throw new HttpError("Este lote ya tiene registrado el combustible entregado", 409);
    }

    const actualizado = await prisma.loteDespacho.update({
      where: { id },
      data: { combustibleEntregadoLitros: data.combustibleEntregadoLitros },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "REGISTRAR_COMBUSTIBLE_ENTREGADO_LOTE",
        data: { loteId: id, combustibleEntregadoLitros: data.combustibleEntregadoLitros },
      },
    });

    return actualizado;
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

      // Libera el número para el próximo lote del mes (ver correlativo.ts).
      const actualizado = await tx.loteDespacho.update({
        where: { id },
        data: {
          estadoLote: "ANULADO",
          correlativo: await correlativoLiberadoDeLoteAnulado(tx, lote.correlativo, lote.anio),
        },
      });

      await tx.anulacionLote.create({
        data: { loteId: id, usuarioId: userId, motivo: data.motivo },
      });

      // Si este lote ya estaba incluido en una liquidación todavía en
      // BORRADOR, esa fila queda huérfana: se limpia aquí mismo para que el
      // total pendiente de cierre no siga contando un viaje anulado (si la
      // liquidación ya estaba CERRADA, el lote no puede llegar a este punto
      // porque arriba se bloquea anular un lote LIQUIDADO).
      await tx.liquidacionDetalleLote.deleteMany({
        where: { loteId: id, liquidacion: { estado: "BORRADOR" } },
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

  // Importación masiva de lotes desde el "Cuadro de envío de Carga Chami" en
  // Excel — a diferencia de create(), acá el correlativo se preserva EXACTO
  // del Conocimiento físico (nunca se genera uno nuevo). La mayoría de filas
  // son viajes YA COMPLETADOS (pesados, con F101 vinculado) y entran
  // directo como ACOPIADO sin tocar vehiculo.estadoActual (son historia
  // cerrada, no algo "en curso"). Pero una fila sin peso todavía es un viaje
  // real EN_TRANSITO (el camión sigue en la ruta) — entra con ese estado, y
  // ahí sí se marca el vehículo EN_TRANSITO, para no repetir a mano lo que
  // hubo que corregir la vez pasada con la importación de octubre.
  //
  // Transportista: se busca por nombre exacto contra lo ya registrado; si no
  // existe, la fila queda en error (no se adivina si es Empresa o Trabajador
  // Particular, eso afecta directamente la tarifa aplicable). Vehículo y
  // chofer sí se crean solos si no existen (más bajo el riesgo si se
  // equivocan, y es lo normal al sumar una volqueta/chofer nuevo al padrón).
  //
  // El año de cada fila se corrige automáticamente contra el año que más se
  // repite en todo el archivo (cubre los típicos errores de tipeo tipo
  // "2034"/"2035" en vez de "2026"), y queda reportado como advertencia.
  async importarHistoricoDesdeExcel(buffer: Buffer, userId: number): Promise<ResultadoImportacionLotes> {
    const filas = parseCuadroEnvioExcel(buffer);
    if (filas.length === 0) throw new HttpError("El Excel no contiene filas de datos", 400);

    const anios = filas
      .map((f) => f.fecha?.getUTCFullYear())
      .filter((a): a is number => typeof a === "number");
    const conteoAnios = new Map<number, number>();
    for (const a of anios) conteoAnios.set(a, (conteoAnios.get(a) ?? 0) + 1);
    let anioReferencia = anios[0] ?? new Date().getUTCFullYear();
    let maxConteo = 0;
    for (const [a, c] of conteoAnios) {
      if (c > maxConteo) {
        maxConteo = c;
        anioReferencia = a;
      }
    }

    const tipoMineral = await prisma.tipoMineral.findUnique({ where: { codigo: "C-CH" } });
    const ingenio = await prisma.ingenio.findUnique({ where: { codigo: "CH" } });
    if (!tipoMineral) {
      throw new HttpError('No se encontró el tipo de mineral "Carga Chami" (C-CH). Créalo primero en Parámetros.', 409);
    }
    if (!ingenio) {
      throw new HttpError('No se encontró el ingenio "Chilcobija" (CH). Créalo primero en Parámetros.', 409);
    }

    // Se trae la lista completa UNA vez (no por fila) y se compara en
    // memoria normalizando espacios/mayúsculas — así "Roger Quispe Miranda "
    // (con un espacio de más, u otra capitalización) sigue encontrando al
    // mismo transportista en vez de forzar a crear uno nuevo "para que no
    // salga error con el nombre" (que es justo lo que pasó: terminó
    // duplicando a Roger Quispe Miranda).
    const normalizarNombre = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");
    const transportistas = await prisma.transportista.findMany();

    const resultados: FilaImportLoteResultado[] = [];
    const contadoresAfectados = new Map<string, number>();

    for (const f of filas) {
      try {
        if (!f.fecha) {
          resultados.push({ fila: f.fila, correlativo: null, accion: "error", mensaje: "Fecha inválida o vacía" });
          continue;
        }
        if (!f.placa) {
          resultados.push({ fila: f.fila, correlativo: null, accion: "error", mensaje: "Falta la placa" });
          continue;
        }
        if (!f.chofer) {
          resultados.push({ fila: f.fila, correlativo: null, accion: "error", mensaje: "Falta el chofer" });
          continue;
        }
        if (!f.correlativoNumero || !f.correlativoMes) {
          resultados.push({
            fila: f.fila,
            correlativo: null,
            accion: "error",
            mensaje: 'Columna "Conocimiento" inválida (se espera "N/MM")',
          });
          continue;
        }
        if (!f.propietario) {
          resultados.push({ fila: f.fila, correlativo: null, accion: "error", mensaje: "Falta el propietario/transportista" });
          continue;
        }
        if (!f.municipioCodigo) {
          resultados.push({ fila: f.fila, correlativo: null, accion: "error", mensaje: "Falta el código de municipio" });
          continue;
        }

        let anio = f.fecha.getUTCFullYear();
        const mesOriginal = f.fecha.getUTCMonth() + 1;
        const diaOriginal = f.fecha.getUTCDate();

        let advertenciaAnio = "";
        if (anio !== anioReferencia) {
          advertenciaAnio = ` (año corregido de ${anio} a ${anioReferencia})`;
          anio = anioReferencia;
        }

        // El Conocimiento ("105/09") es la fuente de verdad del MES
        // (confirmado con el usuario: el sufijo es a la vez el código de
        // serie y el mes calendario) — si la columna FECHA trae un mes
        // distinto (típico al arrastrar/completar fechas en Excel), se
        // corrige el mes manteniendo el DÍA tal cual estaba escrito, y
        // queda reportado para poder auditar qué filas se corrigieron.
        const mesConocimiento = f.correlativoMes ? Number(f.correlativoMes) : null;
        let advertenciaMes = "";
        let fechaCorregida = new Date(Date.UTC(anio, mesOriginal - 1, diaOriginal));
        if (mesConocimiento && mesConocimiento >= 1 && mesConocimiento <= 12 && mesConocimiento !== mesOriginal) {
          advertenciaMes = ` (ATENCIÓN: la fecha traía mes ${String(mesOriginal).padStart(2, "0")}, se corrigió a ${f.correlativoMes} según el Conocimiento)`;
          fechaCorregida = new Date(Date.UTC(anio, mesConocimiento - 1, diaOriginal));
        }

        const correlativo = `${f.correlativoNumero}/${f.correlativoMes}`;

        const existente = await prisma.loteDespacho.findUnique({
          where: { correlativo_anio: { correlativo, anio } },
        });
        if (existente) {
          resultados.push({
            fila: f.fila,
            correlativo,
            accion: "omitido",
            mensaje: `Ya existe (estado ${existente.estadoLote})`,
          });
          continue;
        }

        const transportista = transportistas.find(
          (t) => normalizarNombre(t.nombreORazonSocial) === normalizarNombre(f.propietario),
        );
        if (!transportista) {
          resultados.push({
            fila: f.fila,
            correlativo,
            accion: "error",
            mensaje: `Transportista "${f.propietario}" no encontrado — créalo primero en Logística/Flota`,
          });
          continue;
        }

        let municipio = await prisma.municipioOrigen.findUnique({ where: { codigo: f.municipioCodigo } });
        if (!municipio) {
          municipio = await prisma.municipioOrigen.create({
            data: { codigo: f.municipioCodigo, nombre: f.municipioNombre || f.municipioCodigo },
          });
        }

        let vehiculo = await prisma.vehiculo.findUnique({ where: { placa: f.placa } });
        const vehiculoCreado = !vehiculo;
        if (!vehiculo) {
          vehiculo = await prisma.vehiculo.create({
            data: { placa: f.placa, tipo: "VOLQUETA", capacidadTon: 7, propietarioId: transportista.id },
          });
        }

        let chofer = await prisma.chofer.findFirst({ where: { nombre: f.chofer } });
        const choferCreado = !chofer;
        if (!chofer) {
          const ciPlaceholder = `PENDIENTE-${f.chofer.toUpperCase().replace(/\s+/g, "-")}`;
          chofer = await prisma.chofer.upsert({
            where: { ci: ciPlaceholder },
            create: { nombre: f.chofer, ci: ciPlaceholder },
            update: {},
          });
        }

        // f.pesoKg ya viene en toneladas (la conversión de kilos a
        // toneladas, cuando corresponde, la hace parsePesoToneladas en el
        // parser — acá ya no hay que dividir entre 1000 de nuevo).
        const tonelajeNeto = f.pesoKg;

        let form101Mensaje = "";
        let form101Existente: { id: string } | null = null;
        if (f.form101) {
          form101Existente = await prisma.formulario101.findUnique({ where: { codigo: f.form101 } });
          if (form101Existente) form101Mensaje = ` (F101 ${f.form101} ya existía, no se vinculó)`;
        }

        const fecha = fechaCorregida;
        await prisma.$transaction(async (tx) => {
          const lote = await tx.loteDespacho.create({
            data: {
              correlativo,
              anio,
              municipioOrigenId: municipio.id,
              transportistaId: transportista.id,
              vehiculoId: vehiculo.id,
              choferId: chofer.id,
              tipoMineralId: tipoMineral.id,
              destinoIngenioId: ingenio.id,
              nivel: f.nivel || null,
              incluyeCombustible: f.combustibleLitros ? "CON_COMBUSTIBLE" : "SIN_COMBUSTIBLE",
              combustibleAsignadoLitros: f.combustibleLitros,
              fechaDespachoReal: fecha,
              fechaDocumentalFiscal: fecha,
              estadoLote: tonelajeNeto !== null ? "ACOPIADO" : "EN_TRANSITO",
              usuarioRegistroId: userId,
              conocimientoCarga: {
                create: {
                  fecha,
                  detalleCarga: "Carga Chami",
                  descripcion: "Carga para Ingenio del sector Lipeña",
                  copiasEmitidas: { ingenio: true, chofer: true, empresa: true },
                },
              },
              ...(tonelajeNeto !== null
                ? {
                    pesaje: {
                      create: {
                        tonelajeBruto: tonelajeNeto,
                        tonelajeTara: 0,
                        tonelajeNeto,
                        fechaPesaje: fecha,
                        usuarioId: userId,
                      },
                    },
                  }
                : {}),
            },
          });

          if (f.form101 && !form101Existente) {
            await tx.formulario101.create({
              data: { codigo: f.form101, fecha, estado: "VINCULADO", loteId: lote.id, usuarioId: userId },
            });
          }

          // Viaje real en curso (todavía sin pesar) — el vehículo no puede
          // seguir figurando DISPONIBLE en el tablero de Flota.
          if (tonelajeNeto === null) {
            await tx.vehiculo.update({ where: { id: vehiculo.id }, data: { estadoActual: "EN_TRANSITO" } });
          }

          await tx.log.create({
            data: {
              usuarioId: userId,
              accion: "IMPORT_LOTE_HISTORICO_EXCEL",
              data: { loteId: lote.id, correlativo, fila: f.fila },
            },
          });
        });

        // Mismo formato de clave que generarCorrelativoLote() (mes con 2
        // dígitos) — si el Conocimiento físico trajera el mes sin el cero
        // ("53/9" en vez de "53/09"), sin este padStart el contador que
        // usan los lotes creados a mano quedaría sin actualizar, y el
        // siguiente lote manual de ese mes podría repetir este mismo
        // correlativo.
        const claveContador = `LOTE_DESPACHO_${anio}_${f.correlativoMes.padStart(2, "0")}`;
        contadoresAfectados.set(
          claveContador,
          Math.max(contadoresAfectados.get(claveContador) ?? 0, f.correlativoNumero),
        );

        const extras = [
          vehiculoCreado ? "vehículo nuevo" : null,
          choferCreado ? "chofer nuevo" : null,
          tonelajeNeto === null ? "sin peso" : null,
        ]
          .filter(Boolean)
          .join(", ");

        resultados.push({
          fila: f.fila,
          correlativo,
          accion: "creado",
          mensaje: `Creado${extras ? ` (${extras})` : ""}${form101Mensaje}${advertenciaAnio}${advertenciaMes}`,
        });
      } catch (error) {
        resultados.push({ fila: f.fila, correlativo: null, accion: "error", mensaje: (error as Error).message });
      }
    }

    for (const [clave, numero] of contadoresAfectados) {
      const contador = await prisma.correlativoContador.findUnique({ where: { clave } });
      const nuevoUltimoNumero = Math.max(contador?.ultimoNumero ?? 0, numero);
      await prisma.correlativoContador.upsert({
        where: { clave },
        create: { clave, ultimoNumero: nuevoUltimoNumero },
        update: { ultimoNumero: nuevoUltimoNumero },
      });
    }

    const creadas = resultados.filter((r) => r.accion === "creado").length;
    const omitidas = resultados.filter((r) => r.accion === "omitido").length;
    const errores = resultados.filter((r) => r.accion === "error").length;

    logger.info(
      { userId, creadas, omitidas, errores, action: "IMPORT_LOTE_HISTORICO_EXCEL" },
      "Importación histórica de lotes desde Excel",
    );

    return { procesadas: filas.length, creadas, omitidas, errores, resultados };
  },
};
