import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { generarNumeroLiquidacionTransporte, gestionMineraDe } from "../../utils/correlativo.js";
import { buscarPrecioCombustibleVigente } from "../precioCombustible/precioCombustible.service.js";
import type {
  AgregarItemConceptoDTO,
  AnularLiquidacionDTO,
  CreateLiquidacionDTO,
  PreviewLiquidacionQuery,
} from "./liquidacion.types.js";
import type { z } from "zod";
import type { liquidacionQuerySchema } from "./liquidacion.schema.js";

type LiquidacionQuery = z.infer<typeof liquidacionQuerySchema>;

const INCLUDE_DETALLE = {
  transportista: true,
  detalleLotes: {
    include: {
      lote: {
        include: { vehiculo: true, tipoMineral: true, municipioOrigen: true, destinoIngenio: true, chofer: true },
      },
    },
  },
  itemsConcepto: { include: { concepto: true } },
  anulacion: true,
} as const;

// Prioridad de tarifa (de más a menos específica), en 2 niveles:
//
//   Nivel A — transportista + mineral (el de siempre, sin cambios):
//     (1) negociada con ESTE transportista puntual + este mineral;
//     (2) de este transportista para cualquier mineral;
//     (3) genérica del tipo de entidad (Empresa/Particular) + este mineral;
//     (4) genérica de ese tipo para cualquier mineral.
//
//   Nivel B — combustible (desempate MÁS fino, dentro de cada combo de
//   arriba): primero se busca una tarifa que distinga explícitamente el
//   estado de combustible de ESTE viaje (CON_COMBUSTIBLE/SIN_COMBUSTIBLE);
//   si no existe, cae a la tarifa de ese mismo combo que no distingue
//   combustible (incluyeCombustible = null) — así TODA tarifa ya registrada
//   antes de este campo (que quedó en null) sigue aplicando exactamente
//   igual que siempre, y un transportista solo necesita una fila nueva si de
//   verdad quiere cobrar distinto según si la empresa puso el combustible.
//
// La primera que exista y esté vigente en la fecha gana.
async function buscarTarifaAplicable(
  tipoEntidad: string,
  transportistaId: number,
  tipoMineralId: number,
  incluyeCombustible: string,
  fecha: Date,
) {
  const vigente = (
    tipoMineralIdFiltro: number | null,
    transportistaIdFiltro: number | null,
    incluyeCombustibleFiltro: string | null,
  ) =>
    prisma.tarifaLiquidacion.findFirst({
      where: {
        tipoEntidad: tipoEntidad as any,
        tipoMineralId: tipoMineralIdFiltro,
        transportistaId: transportistaIdFiltro,
        incluyeCombustible: incluyeCombustibleFiltro as any,
        vigenteDesde: { lte: fecha },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: fecha } }],
      },
      orderBy: { vigenteDesde: "desc" },
    });

  const combos: Array<[number | null, number | null]> = [
    [tipoMineralId, transportistaId],
    [null, transportistaId],
    [tipoMineralId, null],
    [null, null],
  ];

  for (const [mineralFiltro, transportistaFiltro] of combos) {
    const [conCombustibleEspecifico, sinDistincion] = await Promise.all([
      vigente(mineralFiltro, transportistaFiltro, incluyeCombustible),
      vigente(mineralFiltro, transportistaFiltro, null),
    ]);
    const tarifa = conCombustibleEspecifico ?? sinDistincion;
    if (tarifa) return tarifa;
  }

  return null;
}

// Si el transportista ya tiene una tarifa CON_COMBUSTIBLE registrada
// (específica para él, o genérica para su tipoEntidad), su precio/ton ya
// refleja que la empresa pone el combustible — sugerir ADEMÁS una
// deducción manual por el combustible real duplicaría el descuento. Por
// eso el concepto "esCombustible" solo se ofrece cuando NO existe ninguna
// tarifa así para este transportista.
async function tieneTarifaConCombustibleRegistrada(transportista: { id: number; tipoEntidad: string }) {
  const tarifa = await prisma.tarifaLiquidacion.findFirst({
    where: {
      incluyeCombustible: "CON_COMBUSTIBLE",
      OR: [{ transportistaId: transportista.id }, { transportistaId: null, tipoEntidad: transportista.tipoEntidad as any }],
    },
  });
  return Boolean(tarifa);
}

// Sugerencia de monto para el concepto de deducción marcado `esCombustible`
// (ver ConceptoLiquidacion.esCombustible en schema.prisma): suma los litros
// REALMENTE asignados (LoteDespacho.combustibleAsignadoLitros) de los lotes
// CON_COMBUSTIBLE de esta liquidación, cada uno multiplicado por el precio
// por litro vigente en SU fecha de despacho (el precio del combustible
// cambia de semana a semana o de mes a mes, igual que una tarifa). Si falta
// registrar el precio vigente para alguna fecha, el monto sugerido queda en
// null (nunca se sugiere un número incompleto) y se reportan esas fechas.
async function calcularCombustibleSugerido(
  transportista: { id: number; tipoEntidad: string },
  detalleLotes: Array<{
    lote: { incluyeCombustible: string; combustibleAsignadoLitros: Prisma.Decimal | null; fechaDespachoReal: Date };
  }>,
) {
  const bloqueadoPorTarifaConCombustible = await tieneTarifaConCombustibleRegistrada(transportista);

  const viajesConCombustible = detalleLotes.filter(
    (d) => d.lote.incluyeCombustible === "CON_COMBUSTIBLE" && d.lote.combustibleAsignadoLitros !== null,
  );

  let litrosTotal = 0;
  let montoSugerido = 0;
  let faltaPrecio = false;
  const fechasSinPrecio = new Set<string>();

  for (const d of viajesConCombustible) {
    const litros = Number(d.lote.combustibleAsignadoLitros);
    litrosTotal += litros;
    const precio = await buscarPrecioCombustibleVigente(d.lote.fechaDespachoReal);
    if (!precio) {
      faltaPrecio = true;
      fechasSinPrecio.add(d.lote.fechaDespachoReal.toISOString().slice(0, 10));
      continue;
    }
    montoSugerido += litros * Number(precio.precioPorLitro);
  }

  return {
    litrosTotal: Math.round(litrosTotal * 100) / 100,
    montoSugerido: faltaPrecio ? null : Math.round(montoSugerido * 100) / 100,
    fechasSinPrecio: Array.from(fechasSinPrecio),
    bloqueadoPorTarifaConCombustible,
  };
}

interface LoteElegible {
  loteId: string;
  correlativo: string;
  fechaDespachoReal: Date;
  vehiculoId: number;
  vehiculoPlaca: string;
  choferNombre: string;
  tipoMineral: string;
  incluyeCombustible: string;
  tonelajeNeto: number;
  precioAplicado: number;
  subtotal: number;
}

interface GrupoLiquidacion {
  vehiculoId: number;
  vehiculoPlaca: string;
  precioAplicado: number;
  loteIds: string[];
  tonelajeNetoSumado: number;
  tonelajeNetoRedondeado: number;
  subtotal: number;
}

// Método real confirmado contra los documentos físicos del usuario: NO se
// redondea cada viaje por separado y después se suman los redondeos — se
// agrupa por volqueta (y por el precio que le corresponda, por si el mismo
// vehículo tuvo tarifas distintas en el rango), se suma el tonelaje CRUDO
// de 3 decimales de todo el grupo, se redondea esa suma UNA sola vez a 2
// decimales, y recién ahí se multiplica por el precio/ton. Verificado
// bit a bit contra dos filas reales del documento (159.53×264.48=42192.4944
// → 42192.49; 144.08×264.48=38106.2784→38106.28). Esto puede diferir del
// viejo método (redondear cada viaje y sumar) por varios bolivianos cuando
// un mismo vehículo tiene muchos viajes en el período.
function agruparPorVehiculoYPrecio(elegibles: LoteElegible[]): GrupoLiquidacion[] {
  const grupos = new Map<string, GrupoLiquidacion>();

  for (const e of elegibles) {
    const clave = `${e.vehiculoId}_${e.precioAplicado}`;
    const grupo = grupos.get(clave);
    if (grupo) {
      grupo.tonelajeNetoSumado += e.tonelajeNeto;
      grupo.loteIds.push(e.loteId);
    } else {
      grupos.set(clave, {
        vehiculoId: e.vehiculoId,
        vehiculoPlaca: e.vehiculoPlaca,
        precioAplicado: e.precioAplicado,
        loteIds: [e.loteId],
        tonelajeNetoSumado: e.tonelajeNeto,
        tonelajeNetoRedondeado: 0,
        subtotal: 0,
      });
    }
  }

  for (const grupo of grupos.values()) {
    grupo.tonelajeNetoRedondeado = Math.round(grupo.tonelajeNetoSumado * 100) / 100;
    grupo.subtotal = Math.round(grupo.tonelajeNetoRedondeado * grupo.precioAplicado * 100) / 100;
  }

  return Array.from(grupos.values());
}

// Total bruto igual que la planilla Excel real: cada fila guarda peso ×
// precio SIN redondear (solo se ve con 2 decimales) y el total suma esos
// valores y redondea una sola vez — 616,79 × 336,41 = 207.494,3239 →
// 207.494,32, mientras que sumar las filas ya redondeadas daba 207.494,33.
function totalBrutoDeGrupos(grupos: GrupoLiquidacion[]): number {
  return Math.round(grupos.reduce((acc, g) => acc + g.tonelajeNetoRedondeado * g.precioAplicado, 0) * 100) / 100;
}

// Lógica compartida entre preview() (solo lectura) y create() (persiste):
// arma la lista de lotes ACOPIADO de este transportista en el rango, con
// la tarifa ya resuelta — así el preview le muestra al usuario EXACTAMENTE
// lo que create() va a guardar, nunca un cálculo aproximado aparte.
async function construirElegibles(transportistaId: number, fechaInicio: Date, fechaFin: Date) {
  const transportista = await prisma.transportista.findUnique({ where: { id: transportistaId } });
  if (!transportista) throw new HttpError("Transportista no encontrado", 404);

  const lotes = await prisma.loteDespacho.findMany({
    where: {
      transportistaId,
      estadoLote: "ACOPIADO",
      fechaDespachoReal: { gte: fechaInicio, lte: fechaFin },
      // Sin esto, dos liquidaciones con rangos que se pisan (o el mismo
      // rango creado dos veces) podían capturar el MISMO lote en ambas —
      // el lote sigue ACOPIADO mientras la primera liquidación esté en
      // BORRADOR, así que "estaba libre" para la segunda también. Si
      // ambas se llegaban a cerrar, ese viaje se pagaba dos veces. Un
      // lote ya incluido en cualquier liquidación que no esté anulada
      // (BORRADOR o CERRADO) queda fuera de esta lista.
      detallesLiquidacion: { none: { liquidacion: { estado: { not: "ANULADO" } } } },
    },
    include: { pesaje: true, vehiculo: true, tipoMineral: true, chofer: true },
    orderBy: { fechaDespachoReal: "asc" },
  });

  const elegibles: LoteElegible[] = [];

  for (const lote of lotes) {
    if (!lote.pesaje) continue;

    const tarifa = await buscarTarifaAplicable(
      transportista.tipoEntidad,
      transportista.id,
      lote.tipoMineralId,
      lote.incluyeCombustible,
      lote.fechaDespachoReal,
    );
    if (!tarifa) {
      throw new HttpError(
        `No hay una tarifa de liquidación vigente para el lote ${lote.correlativo}. Registra la tarifa antes de continuar.`,
        400,
      );
    }

    const tonelajeNeto = Number(lote.pesaje.tonelajeNeto);
    const precioAplicado = Number(tarifa.precioPorTonelada);
    elegibles.push({
      loteId: lote.id,
      correlativo: lote.correlativo,
      fechaDespachoReal: lote.fechaDespachoReal,
      vehiculoId: lote.vehiculoId,
      vehiculoPlaca: lote.vehiculo.placa,
      choferNombre: lote.chofer.nombre,
      tipoMineral: lote.tipoMineral.nombre,
      incluyeCombustible: lote.incluyeCombustible,
      tonelajeNeto,
      precioAplicado,
      // Subtotal informativo por viaje (se muestra en el detalle), pero el
      // total real de la liquidación NO es la suma de estos — ver
      // agruparPorVehiculoYPrecio().
      subtotal: Math.round(tonelajeNeto * precioAplicado * 100) / 100,
    });
  }

  const grupos = agruparPorVehiculoYPrecio(elegibles);
  return { transportista, elegibles, grupos };
}

export const liquidacionService = {
  // Vista previa sin persistir: qué lotes y cuánto se le pagaría a este
  // transportista en este rango, para decidir ANTES de crear/cerrar nada.
  async preview(query: PreviewLiquidacionQuery) {
    const { transportista, elegibles, grupos } = await construirElegibles(
      query.transportistaId,
      query.fechaInicio,
      query.fechaFin,
    );

    const totalBruto = totalBrutoDeGrupos(grupos);

    return {
      transportista,
      lotes: elegibles,
      grupos,
      totalLotes: elegibles.length,
      totalBruto,
    };
  },
  async getAll(query: LiquidacionQuery) {
    const where: any = {};
    if (query.transportistaId) where.transportistaId = query.transportistaId;
    if (query.estado) where.estado = query.estado;

    return prisma.liquidacionPeriodo.findMany({
      where,
      include: { transportista: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    const liquidacion = await prisma.liquidacionPeriodo.findUnique({ where: { id }, include: INCLUDE_DETALLE });
    if (!liquidacion) return null;

    const combustibleSugerido = await calcularCombustibleSugerido(liquidacion.transportista, liquidacion.detalleLotes);
    return { ...liquidacion, combustibleSugerido };
  },

  // Arma el detalle a partir de los lotes ACOPIADO del transportista dentro
  // del rango de fechas; la liquidación queda en BORRADOR hasta cerrarse.
  async create(data: CreateLiquidacionDTO, userId: number) {
    const { elegibles } = await construirElegibles(data.transportistaId, data.fechaInicio, data.fechaFin);

    if (elegibles.length === 0) {
      throw new HttpError("No hay lotes ACOPIADOS de este transportista en el rango de fechas indicado", 400);
    }

    const detalle = elegibles.map((e) => ({
      loteId: e.loteId,
      tonelajeNeto: e.tonelajeNeto,
      precioAplicado: e.precioAplicado,
      subtotal: e.subtotal,
    }));

    const liquidacion = await prisma.$transaction(async (tx) => {
      const creada = await tx.liquidacionPeriodo.create({
        data: {
          transportistaId: data.transportistaId,
          tipoPeriodo: data.tipoPeriodo,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          usuarioId: userId,
          detalleLotes: { create: detalle },
        },
        include: INCLUDE_DETALLE,
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_LIQUIDACION",
          data: { liquidacionId: creada.id, transportistaId: data.transportistaId, lotesIncluidos: detalle.length },
        },
      });

      return creada;
    });

    logger.info(
      { userId, liquidacionId: liquidacion.id, action: "CREATE_LIQUIDACION" },
      "Liquidación creada en borrador",
    );

    return liquidacion;
  },

  async agregarItemConcepto(liquidacionId: string, data: AgregarItemConceptoDTO, userId: number) {
    const [liquidacion, concepto] = await Promise.all([
      prisma.liquidacionPeriodo.findUnique({ where: { id: liquidacionId } }),
      prisma.conceptoLiquidacion.findUnique({ where: { id: data.conceptoId } }),
    ]);

    if (!liquidacion) throw new HttpError("Liquidación no encontrada", 404);
    if (liquidacion.estado !== "BORRADOR") {
      throw new HttpError("Solo se pueden agregar conceptos a una liquidación en BORRADOR", 409);
    }
    if (!concepto) throw new HttpError("Concepto de liquidación no encontrado", 404);

    const item = await prisma.liquidacionItemConcepto.create({
      data: {
        liquidacionId,
        conceptoId: data.conceptoId,
        monto: data.monto,
        descripcion: data.descripcion ?? null,
      },
      include: { concepto: true },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "AGREGAR_ITEM_CONCEPTO_LIQUIDACION",
        data: { liquidacionId, conceptoId: data.conceptoId, monto: data.monto },
      },
    });

    return item;
  },

  async quitarItemConcepto(liquidacionId: string, itemId: string, userId: number) {
    const [liquidacion, item] = await Promise.all([
      prisma.liquidacionPeriodo.findUnique({ where: { id: liquidacionId } }),
      prisma.liquidacionItemConcepto.findUnique({ where: { id: itemId } }),
    ]);

    if (!liquidacion) throw new HttpError("Liquidación no encontrada", 404);
    if (liquidacion.estado !== "BORRADOR") {
      throw new HttpError("Solo se pueden quitar conceptos de una liquidación en BORRADOR", 409);
    }
    if (!item || item.liquidacionId !== liquidacionId) {
      throw new HttpError("Concepto no encontrado en esta liquidación", 404);
    }

    await prisma.liquidacionItemConcepto.delete({ where: { id: itemId } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "QUITAR_ITEM_CONCEPTO_LIQUIDACION", data: { liquidacionId, itemId } },
    });
  },

  // Compare-and-swap: el `updateMany` con `estado: "BORRADOR"` en el where
  // asegura que, si dos clics de "Cerrar" llegan casi al mismo tiempo,
  // solo uno tenga éxito (count === 1) — el otro recibe 409 en vez de
  // duplicar el cierre. Mismo espíritu que la anulación atómica en
  // vales.service.ts, aplicado aquí al cierre de un período.
  async cerrar(id: string, userId: number) {
    return prisma.$transaction(async (tx) => {
      const liquidacion = await tx.liquidacionPeriodo.findUnique({
        where: { id },
        include: {
          detalleLotes: { include: { lote: true } },
          itemsConcepto: { include: { concepto: true } },
        },
      });
      if (!liquidacion) throw new HttpError("Liquidación no encontrada", 404);
      if (liquidacion.estado !== "BORRADOR") {
        throw new HttpError("Solo se puede cerrar una liquidación en BORRADOR", 409);
      }

      // Defensa extra: si un lote se anuló directamente (fuera de esta
      // liquidación) mientras esta seguía en BORRADOR, su fila queda
      // huérfana aquí — se descarta del total y se limpia, para no cobrar
      // por un viaje que ya no existe. anular() en loteDespacho.service.ts
      // ya limpia esto en el momento en que se anula; esto es solo por si
      // quedó una fila de antes de ese fix. Lo mismo con LIQUIDADO: puede
      // pasar si esta liquidación quedó con rango solapado a otra ya
      // creada ANTES del filtro que ahora bloquea eso en construirElegibles
      // — sin este descarte, cerrar esta también pagaría el mismo viaje
      // dos veces.
      const esDescartable = (estado: string) => estado === "ANULADO" || estado === "LIQUIDADO";
      const detalleValidos = liquidacion.detalleLotes.filter((d) => !esDescartable(d.lote.estadoLote));
      const detalleInvalidosIds = liquidacion.detalleLotes
        .filter((d) => esDescartable(d.lote.estadoLote))
        .map((d) => d.id);

      if (detalleValidos.length === 0) {
        throw new HttpError(
          "Todos los lotes de esta liquidación ya fueron anulados o pagados en otra liquidación; no hay nada que cerrar.",
          409,
        );
      }

      // Mismo método que preview(): agrupar por vehículo+precio, sumar el
      // tonelaje crudo del grupo, redondear una sola vez y recién ahí
      // multiplicar por el precio — nunca sumar los subtotales por-viaje
      // ya redondeados (ver agruparPorVehiculoYPrecio()).
      const gruposCierre = agruparPorVehiculoYPrecio(
        detalleValidos.map((d) => ({
          loteId: d.loteId,
          correlativo: d.lote.correlativo,
          fechaDespachoReal: d.lote.fechaDespachoReal,
          vehiculoId: d.lote.vehiculoId,
          vehiculoPlaca: "",
          choferNombre: "",
          tipoMineral: "",
          incluyeCombustible: d.lote.incluyeCombustible,
          tonelajeNeto: Number(d.tonelajeNeto),
          precioAplicado: Number(d.precioAplicado),
          subtotal: Number(d.subtotal),
        })),
      );
      const totalBruto = new Prisma.Decimal(totalBrutoDeGrupos(gruposCierre).toFixed(2));
      const totalAbonos = liquidacion.itemsConcepto
        .filter((i) => i.concepto.tipo === "ABONO")
        .reduce((acc, i) => acc.add(i.monto), new Prisma.Decimal(0));
      const totalDeducciones = liquidacion.itemsConcepto
        .filter((i) => i.concepto.tipo === "DEDUCCION")
        .reduce((acc, i) => acc.add(i.monto), new Prisma.Decimal(0));
      const totalNeto = totalBruto.add(totalAbonos).sub(totalDeducciones);
      // La gestión sale de la fecha del documento (fechaFin), que es la que
      // se imprime como "Fecha, 3 de Octubre del 2026".
      const gestion = gestionMineraDe(liquidacion.fechaFin);
      const numero = await generarNumeroLiquidacionTransporte(tx, gestion);

      if (detalleInvalidosIds.length > 0) {
        await tx.liquidacionDetalleLote.deleteMany({ where: { id: { in: detalleInvalidosIds } } });
      }

      const resultado = await tx.liquidacionPeriodo.updateMany({
        where: { id, estado: "BORRADOR" },
        data: { estado: "CERRADO", numero, gestion, totalBruto, totalAbonos, totalDeducciones, totalNeto },
      });
      if (resultado.count === 0) {
        throw new HttpError("La liquidación ya fue cerrada por otra operación", 409);
      }

      await tx.loteDespacho.updateMany({
        where: { id: { in: detalleValidos.map((d) => d.loteId) } },
        data: { estadoLote: "LIQUIDADO" },
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CERRAR_LIQUIDACION",
          data: { liquidacionId: id, totalNeto: totalNeto.toString() },
        },
      });

      return tx.liquidacionPeriodo.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });
  },

  // Anular una liquidación CERRADA revierte los lotes incluidos a
  // ACOPIADO para que puedan volver a incluirse en una liquidación
  // correcta — nunca queda un lote "huérfano" en LIQUIDADO sin liquidación vigente.
  async anular(id: string, data: AnularLiquidacionDTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const liquidacion = await tx.liquidacionPeriodo.findUnique({
        where: { id },
        include: { detalleLotes: true },
      });
      if (!liquidacion) throw new HttpError("Liquidación no encontrada", 404);
      if (liquidacion.estado === "ANULADO") throw new HttpError("La liquidación ya está anulada", 409);

      if (liquidacion.estado === "CERRADO") {
        await tx.loteDespacho.updateMany({
          where: { id: { in: liquidacion.detalleLotes.map((d) => d.loteId) }, estadoLote: "LIQUIDADO" },
          data: { estadoLote: "ACOPIADO" },
        });
      }

      await tx.liquidacionPeriodo.update({ where: { id }, data: { estado: "ANULADO" } });
      await tx.anulacionLiquidacion.create({
        data: { liquidacionId: id, usuarioId: userId, motivo: data.motivo },
      });

      await tx.log.create({
        data: { usuarioId: userId, accion: "ANULAR_LIQUIDACION", data: { liquidacionId: id, motivo: data.motivo } },
      });

      return tx.liquidacionPeriodo.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });
  },

  // Borrar de verdad (no anular) una liquidación en BORRADOR: todavía no
  // tiene folio asignado, no marcó ningún lote como LIQUIDADO y no movió
  // plata real — a diferencia de anular (que deja un registro permanente
  // con motivo, pensado para una liquidación CERRADA que sí tuvo efecto),
  // acá no hay nada que auditar, así que se puede eliminar sin dejar rastro.
  async eliminarBorrador(id: string, userId: number) {
    const liquidacion = await prisma.liquidacionPeriodo.findUnique({ where: { id } });
    if (!liquidacion) throw new HttpError("Liquidación no encontrada", 404);
    if (liquidacion.estado !== "BORRADOR") {
      throw new HttpError("Solo se puede eliminar una liquidación en BORRADOR (usa anular para una ya cerrada)", 409);
    }

    await prisma.$transaction(async (tx) => {
      await tx.liquidacionItemConcepto.deleteMany({ where: { liquidacionId: id } });
      await tx.liquidacionDetalleLote.deleteMany({ where: { liquidacionId: id } });
      await tx.liquidacionPeriodo.delete({ where: { id } });

      await tx.log.create({
        data: { usuarioId: userId, accion: "ELIMINAR_BORRADOR_LIQUIDACION", data: { liquidacionId: id } },
      });
    });

    logger.info({ userId, liquidacionId: id, action: "ELIMINAR_BORRADOR_LIQUIDACION" }, "Borrador de liquidación eliminado");
  },

};
