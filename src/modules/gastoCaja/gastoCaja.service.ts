import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { obtenerSaldoActualCuentaBancaria } from "../cuentaBancariaCaja/cuentaBancariaCaja.service.js";
import { reportesCajaChicaService } from "../reportesCajaChica/reportesCajaChica.service.js";
import { movimientoFondoCajaService } from "../movimientoFondoCaja/movimientoFondoCaja.service.js";
import { parseCajaChicaExcel, type CategoriaRendicionGastoTexto } from "./gastoCajaImport.parser.js";
import type {
  AnularGastoCajaDTO,
  CreateGastoCajaDTO,
  FilaImportGastoCajaResultado,
  ResultadoImportacionGastosCaja,
  UpdateGastoCajaDTO,
} from "./gastoCaja.types.js";
import type { z } from "zod";
import type { gastoCajaQuerySchema } from "./gastoCaja.schema.js";
import type { TipoMovimientoFondoCaja } from "@prisma/client";

type GastoCajaQuery = z.infer<typeof gastoCajaQuerySchema>;

const INCLUDE_DETALLE = {
  caja: true,
  cuentaBancariaCaja: true,
  centroCostoCaja: true,
  funcionGastoCaja: true,
  cuentaContableCaja: true,
  partidaPresupuesto: true,
  anulacion: true,
} as const;

// Un gasto puede registrarse sin clasificar del todo (centro de costo,
// función de gasto, cuenta contable y/o partida de presupuesto) para no
// bloquear al usuario en el momento — esta bandera, calculada al vuelo
// (nunca guardada), es lo que el frontend usa para marcarlo como
// "información incompleta" y ofrecer completarlo después con update().
function conInfoIncompleta<T extends {
  centroCostoCajaId: number | null;
  funcionGastoCajaId: number | null;
  cuentaContableCajaId: number | null;
  partidaPresupuestoId: number | null;
}>(gasto: T) {
  const informacionIncompleta =
    !gasto.centroCostoCajaId ||
    !gasto.funcionGastoCajaId ||
    !gasto.cuentaContableCajaId ||
    !gasto.partidaPresupuestoId;
  return { ...gasto, informacionIncompleta };
}

async function obtenerPorcentaje(codigo: "RC_IVA" | "IUE_COMPRAS" | "IT") {
  const concepto = await prisma.conceptoRetencionCaja.findUnique({ where: { codigo } });
  if (!concepto || !concepto.activo) {
    throw new HttpError(
      `No hay una tasa activa configurada para ${codigo}. Configúrala en Parámetros de Caja Chica.`,
      409,
    );
  }
  return Number(concepto.porcentaje) / 100;
}

// Motor tributario: siempre lee las tasas desde ConceptoRetencionCaja
// (nunca hardcodeadas), así que cambiar un porcentaje después no requiere
// tocar código — igual que TarifaLiquidacion en el módulo de Logística.
//
// FACTURA            -> separa el 13% (tasa RC_IVA) como Crédito Fiscal IVA.
// CONTRATO_RETENCION
//   + SERVICIO        -> retiene RC-IVA (cuenta "RC-IVA Retenciones Servicios") + IT.
//   + COMPRA          -> retiene IUE Compras + IT.
// RECIBO              -> con respaldo pero sin tratamiento tributario: sin
//                        créditos ni retenciones, y SÍ deducible.
// RECIBO_DIRECTO      -> sin respaldo: 100% a Gastos No Deducibles, sin
//                        créditos ni retenciones.
type DatosImpuesto = {
  tipoDocumento: CreateGastoCajaDTO["tipoDocumento"];
  categoriaRetencion?: CreateGastoCajaDTO["categoriaRetencion"] | null;
  montoTotal: number;
};

async function calcularImpuestos(data: DatosImpuesto) {
  let montoCreditoFiscalIva = 0;
  let montoRetencionRcIva = 0;
  let montoRetencionIueCompras = 0;
  let montoRetencionIt = 0;
  let esNoDeducible = false;

  if (data.tipoDocumento === "FACTURA") {
    const tasaIva = await obtenerPorcentaje("RC_IVA");
    montoCreditoFiscalIva = Math.round(data.montoTotal * tasaIva * 100) / 100;
  } else if (data.tipoDocumento === "CONTRATO_RETENCION") {
    const tasaIt = await obtenerPorcentaje("IT");
    montoRetencionIt = Math.round(data.montoTotal * tasaIt * 100) / 100;

    if (data.categoriaRetencion === "SERVICIO") {
      const tasaRcIva = await obtenerPorcentaje("RC_IVA");
      montoRetencionRcIva = Math.round(data.montoTotal * tasaRcIva * 100) / 100;
    } else {
      const tasaIueCompras = await obtenerPorcentaje("IUE_COMPRAS");
      montoRetencionIueCompras = Math.round(data.montoTotal * tasaIueCompras * 100) / 100;
    }
  } else if (data.tipoDocumento === "RECIBO_DIRECTO") {
    esNoDeducible = true;
  }
  // RECIBO: con respaldo, sin créditos ni retenciones, deducible — todos los
  // montos quedan en 0 y esNoDeducible en false (los valores por defecto).

  return { montoCreditoFiscalIva, montoRetencionRcIva, montoRetencionIueCompras, montoRetencionIt, esNoDeducible };
}

// Clasifica el tipo de remesa de "FONDOS RECIBIDOS" por su descripción —
// las tres variantes reales confirmadas contra el documento físico (Caja
// Lipeña): "REMESA PARA COMPRAS GENERAL", "REMESA PAGO DE SALARIOS",
// "REMESA PRESUPUESTO". Cualquier otra cosa cae a REMESA_OTROS.
function clasificarTipoMovimiento(descripcion: string): TipoMovimientoFondoCaja {
  const texto = descripcion.toUpperCase();
  if (texto.includes("SUELDO") || texto.includes("SALARIO")) return "REMESA_SUELDOS";
  if (texto.includes("COMPRA")) return "REMESA_COMPRAS_GENERAL";
  if (texto.includes("PRESUPUESTO")) return "REMESA_PRESUPUESTO";
  if (texto.includes("REPOSICION") || texto.includes("REPOSICIÓN")) return "REPOSICION";
  return "REMESA_OTROS";
}

// El Excel no trae fecha por fila de gasto, solo el mes/año del reporte
// ("MES DE: SEPTIEMBRE DEL 2026") — en vez de ponerle la misma fecha a
// todos (el día 1, cuando el presupuesto del mes puede ni estar aprobado
// todavía), se reparte cada fila en un día distinto dentro del mes, nunca
// el día 1, proporcional a su posición en el documento (que es cronológico
// en el reporte real) para que las últimas filas caigan cerca de fin de mes,
// igual que ocurriría con gastos reales a lo largo del mes.
function fechaParaFilaGasto(anio: number, mes: number, indice: number, total: number): Date {
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const diasDisponibles = ultimoDia - 1; // día 2..último día del mes
  const posicion = total <= 1 ? 0 : indice / (total - 1);
  const dia = 2 + Math.round(posicion * (diasDisponibles - 1));
  return new Date(Date.UTC(anio, mes - 1, dia));
}

// "F-1660", "F- 475", "F.130/F-143" -> tiene una factura real detrás (separa
// IVA). Todo lo demás ("DEPOSITO", "CE", "FORMULARIO", "POR FACTURAR",
// "VARIOS", "R-...") tiene respaldo pero no es una factura con NIT, así que
// entra como RECIBO (deducible, sin crédito fiscal ni retenciones) — regla
// confirmada con el usuario contra el documento real.
function clasificarTipoDocumento(facturaORecibo: string): "FACTURA" | "RECIBO" {
  return /^F[-.\s]*\d/i.test(facturaORecibo.trim()) ? "FACTURA" : "RECIBO";
}

// Palabras que no sirven para distinguir UN gasto de otro porque aparecen en
// casi cualquier glosa de este dominio (todas dicen "pago", "gastos",
// "viaje"...) — si no se filtran, dos viáticos de personas DISTINTAS con el
// mismo monto redondo (ej. dos "gastos de viaje" de Bs 40) salían pareciendo
// duplicados solo por compartir esas palabras genéricas.
const STOPWORDS_GENERICAS = new Set([
  "DE", "DEL", "LA", "EL", "LOS", "LAS", "Y", "O", "PARA", "A", "EN", "CON", "POR", "AL", "UN", "UNA", "SIN", "SE", "QUE",
]);
const STOPWORDS_DOMINIO = new Set([
  "PAGO", "PAGOS", "GASTO", "GASTOS", "VIAJE", "VIAJES", "VIATICO", "VIATICOS", "ALIMENTACION", "ALIMENTOS",
  "DEPOSITO", "FACTURA", "RECIBO", "FORMULARIO", "CE", "VARIOS", "TRABAJOS", "TRABAJO",
]);

function tokensSignificativos(texto: string): Set<string> {
  const limpio = texto
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]+/g, " ");
  const tokens = limpio
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS_GENERICAS.has(t) && !STOPWORDS_DOMINIO.has(t));
  return new Set(tokens);
}

// Fracción de la glosa MÁS CORTA (en palabras significativas) que también
// aparece en la otra — 1.0 = una es subconjunto completo de la otra.
function similitudTexto(a: string, b: string): number {
  const ta = tokensSignificativos(a);
  const tb = tokensSignificativos(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let compartidos = 0;
  for (const t of ta) if (tb.has(t)) compartidos += 1;
  return compartidos / Math.min(ta.size, tb.size);
}

// Bs 2 de diferencia absoluta, o 1% del monto mayor — cubre los redondeos
// típicos entre lo que alguien tipeó a mano y lo que trae el Excel original
// (ej. 1899.98 vs 1900.00, 7220.11 vs 7220.12).
function montosParecidos(a: number, b: number): boolean {
  const diferencia = Math.abs(a - b);
  return diferencia <= 2 || diferencia / Math.max(a, b, 1) <= 0.01;
}

// Compara solo los dígitos del número de factura/recibo ("218" vs "F-218",
// "F- 218") — cuando ambos lados tienen uno y coincide, es una señal mucho
// más fuerte que el texto de la glosa (una misma factura no se repite por
// casualidad), y permite confirmar duplicados que no comparten palabras
// (ej. una glosa manual genérica "MATERIAL DE CONSTRUCCION" vs el nombre
// real del proveedor en el Excel, ambos con la misma factura "218").
function respaldosCoinciden(a: string, b: string): boolean {
  const da = a.replace(/\D/g, "");
  const db = b.replace(/\D/g, "");
  return da.length > 0 && da === db;
}

const UMBRAL_SIMILITUD_DUPLICADO = 0.3;

export const gastoCajaService = {
  // Carga masiva del reporte mensual "Caja Lipeña" (fondos recibidos +
  // detalle de gastos) desde Excel — ver gastoCajaImport.parser.ts para el
  // formato esperado. Los fondos se cargan SIEMPRE antes que los gastos: el
  // saldo disponible contra el que create() valida cada gasto depende de
  // que las remesas de este mismo mes ya estén registradas.
  async importarDesdeExcel(buffer: Buffer, userId: number): Promise<ResultadoImportacionGastosCaja> {
    const parseado = parseCajaChicaExcel(buffer);

    // Hoy la empresa solo usa esta caja en la práctica (ver seedCajaChica.ts)
    // — si en el futuro hay más de una, este import tendría que pedir cuál.
    const caja = await prisma.cajaChica.findFirst({ where: { nombre: { contains: "Lipeña", mode: "insensitive" } } });
    if (!caja) {
      throw new HttpError(
        'No se encontró la caja "Caja Bolivianos Lipeña". Créala primero en Parámetros de Caja Chica.',
        409,
      );
    }

    const resultados: FilaImportGastoCajaResultado[] = [];

    for (const f of parseado.fondos) {
      try {
        if (!f.fecha) {
          resultados.push({ fila: f.fila, tipo: "fondo", accion: "error", mensaje: "Fecha inválida o vacía" });
          continue;
        }
        if (f.monto === null || f.monto <= 0) {
          resultados.push({ fila: f.fila, tipo: "fondo", accion: "error", mensaje: "Monto inválido" });
          continue;
        }

        if (f.referencia) {
          const existente = await prisma.movimientoFondoCaja.findFirst({
            where: { cajaId: caja.id, referencia: f.referencia },
          });
          if (existente) {
            resultados.push({
              fila: f.fila,
              tipo: "fondo",
              accion: "omitido",
              mensaje: `Ya existe un fondo con referencia ${f.referencia}`,
            });
            continue;
          }
        }

        const tipo = clasificarTipoMovimiento(f.descripcion);
        await movimientoFondoCajaService.create(
          { cajaId: caja.id, tipo, monto: f.monto, moneda: "BOB", fecha: f.fecha, referencia: f.referencia || undefined },
          userId,
        );
        resultados.push({ fila: f.fila, tipo: "fondo", accion: "creado", mensaje: `Fondo creado (${tipo})` });
      } catch (error) {
        resultados.push({ fila: f.fila, tipo: "fondo", accion: "error", mensaje: (error as Error).message });
      }
    }

    // Se consulta UNA sola vez, ANTES del bucle, y nunca se actualiza con lo
    // que el bucle va creando — si se revisara contra la base de datos en
    // cada vuelta, dos gastos reales distintos con la misma glosa y el mismo
    // monto (ej. 3 hospedajes de Bs 80 con facturas distintas, o varios
    // viáticos de formulario con el mismo monto redondo) se habrían marcado
    // como "ya existe" uno al otro dentro de la MISMA importación,
    // descartando gastos reales. Sin filtro de fecha ni de caja de origen
    // del monto: un gasto cargado a mano antes de tener este importador
    // puede tener cualquier fecha, y el chico que corresponde al mismo
    // viaje real puede valer un par de centavos distinto.
    const existentesAntes = await prisma.gastoCaja.findMany({
      where: { cajaId: caja.id, estado: { not: "ANULADO" } },
      select: { glosa: true, montoTotal: true, numeroRespaldo: true },
    });
    const firmasExistentes = new Set(
      existentesAntes.map((g) => `${g.glosa}|||${Number(g.montoTotal)}|||${g.numeroRespaldo ?? ""}`),
    );

    const totalGastos = parseado.gastos.length;

    for (const [indiceGasto, g] of parseado.gastos.entries()) {
      try {
        if (g.monto === null || g.monto <= 0) {
          resultados.push({ fila: g.fila, tipo: "gasto", accion: "error", mensaje: "Monto inválido" });
          continue;
        }
        if (!g.descripcion) {
          resultados.push({ fila: g.fila, tipo: "gasto", accion: "error", mensaje: "Falta la descripción" });
          continue;
        }

        const numeroRespaldo = g.facturaORecibo || "S/N";
        const firma = `${g.descripcion}|||${g.monto}|||${numeroRespaldo}`;
        if (firmasExistentes.has(firma)) {
          resultados.push({ fila: g.fila, tipo: "gasto", accion: "omitido", mensaje: "Ya existe un gasto igual (misma glosa, monto y respaldo)" });
          continue;
        }

        // Dedup en 3 niveles, de más a menos confiable:
        //  1. Monto parecido Y (texto parecido O mismo n° de factura/recibo)
        //     -> es un duplicado real con alta confianza: se omite solo.
        //  2. Monto parecido pero SIN texto ni n° de respaldo en común
        //     -> ambiguo: NO se crea solo (si de verdad es el mismo gasto,
        //     contarlo dos veces es peor que no crearlo), pero TAMPOCO se
        //     descarta como si fuera seguro un duplicado (podría ser un gasto
        //     real distinto que solo comparte un monto redondo, ej. varios
        //     viáticos de Bs 40 de personas distintas) — queda como
        //     "revisar" para que el usuario decida y lo agregue a mano desde
        //     "Nuevo gasto" si corresponde. Antes esto se omitía igual que el
        //     nivel 1 ("si el monto coincide, nunca se agregue solo"), pero
        //     eso hacía que UN SOLO gasto manual con un monto redondo
        //     bloqueara TODOS los gastos reales del Excel con ese mismo
        //     monto, no solo el duplicado genuino.
        const coincideConfiable = existentesAntes.find(
          (e) =>
            montosParecidos(Number(e.montoTotal), g.monto!) &&
            (similitudTexto(e.glosa, g.descripcion) >= UMBRAL_SIMILITUD_DUPLICADO ||
              respaldosCoinciden(e.numeroRespaldo ?? "", g.facturaORecibo)),
        );
        if (coincideConfiable) {
          resultados.push({
            fila: g.fila,
            tipo: "gasto",
            accion: "omitido",
            mensaje: `No se agregó: mismo monto y texto/n° de respaldo parecido a "${coincideConfiable.glosa}" (Bs ${Number(coincideConfiable.montoTotal).toFixed(2)}) ya registrado.`,
          });
          continue;
        }

        const coincideSoloMonto = existentesAntes.find((e) => montosParecidos(Number(e.montoTotal), g.monto!));
        if (coincideSoloMonto) {
          resultados.push({
            fila: g.fila,
            tipo: "gasto",
            accion: "revisar",
            mensaje: `No se creó: coincide en monto con "${coincideSoloMonto.glosa}" (Bs ${Number(coincideSoloMonto.montoTotal).toFixed(2)}) ya registrado, pero el texto y el n° de respaldo no se parecen — revisa si de verdad es el mismo gasto; si no lo es, agrégalo a mano desde "Nuevo gasto".`,
          });
          continue;
        }

        const tipoDocumento = clasificarTipoDocumento(g.facturaORecibo);
        const fechaGasto =
          parseado.mes && parseado.anio
            ? fechaParaFilaGasto(parseado.anio, parseado.mes, indiceGasto, totalGastos)
            : new Date();
        await this.create(
          {
            origen: "CAJA",
            cajaId: caja.id,
            fecha: fechaGasto,
            tipoDocumento,
            categoriaRendicion: g.categoriaRendicion as CreateGastoCajaDTO["categoriaRendicion"],
            proveedorNombre: g.descripcion.slice(0, 255),
            glosa: g.descripcion,
            numeroRespaldo,
            montoTotal: g.monto,
            moneda: "BOB",
          },
          userId,
        );
        resultados.push({ fila: g.fila, tipo: "gasto", accion: "creado", mensaje: `Creado (${g.categoriaRendicion})` });
      } catch (error) {
        resultados.push({ fila: g.fila, tipo: "gasto", accion: "error", mensaje: (error as Error).message });
      }
    }

    const creadas = resultados.filter((r) => r.accion === "creado").length;
    const omitidas = resultados.filter((r) => r.accion === "omitido").length;
    const paraRevisar = resultados.filter((r) => r.accion === "revisar").length;
    const errores = resultados.filter((r) => r.accion === "error").length;

    logger.info(
      { userId, creadas, omitidas, paraRevisar, errores, action: "IMPORT_GASTO_CAJA_EXCEL" },
      "Importación de Caja Chica desde Excel",
    );

    return {
      procesadas: resultados.length,
      creadas,
      omitidas,
      paraRevisar,
      errores,
      mes: parseado.mes,
      anio: parseado.anio,
      resultados,
    };
  },

  async getAll(query: GastoCajaQuery) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.cajaId) where.cajaId = query.cajaId;
    if (query.cuentaBancariaCajaId) where.cuentaBancariaCajaId = query.cuentaBancariaCajaId;
    if (query.origen) where.origen = query.origen;
    if (query.estado) where.estado = query.estado;
    if (query.fechaInicio || query.fechaFin) {
      where.fecha = {};
      if (query.fechaInicio) where.fecha.gte = query.fechaInicio;
      if (query.fechaFin) where.fecha.lte = query.fechaFin;
    }

    const [gastos, total] = await Promise.all([
      prisma.gastoCaja.findMany({
        where,
        skip,
        take: limit,
        include: {
          caja: true,
          cuentaBancariaCaja: true,
          centroCostoCaja: true,
          funcionGastoCaja: true,
          cuentaContableCaja: true,
          partidaPresupuesto: true,
          anulacion: true,
        },
        orderBy: { fecha: "desc" },
      }),
      prisma.gastoCaja.count({ where }),
    ]);

    return { gastos: gastos.map(conInfoIncompleta), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id: string) {
    const gasto = await prisma.gastoCaja.findUnique({ where: { id }, include: INCLUDE_DETALLE });
    return gasto ? conInfoIncompleta(gasto) : null;
  },

  async create(data: CreateGastoCajaDTO, userId: number) {
    const [caja, cuentaBancariaCaja, centroCosto, funcionGasto, cuentaManual, partidaPresupuesto] = await Promise.all([
      data.origen === "CAJA" && data.cajaId ? prisma.cajaChica.findUnique({ where: { id: data.cajaId } }) : null,
      data.origen === "BANCO" && data.cuentaBancariaCajaId
        ? prisma.cuentaBancariaCaja.findUnique({ where: { id: data.cuentaBancariaCajaId } })
        : null,
      data.centroCostoCajaId ? prisma.centroCostoCaja.findUnique({ where: { id: data.centroCostoCajaId } }) : null,
      data.funcionGastoCajaId ? prisma.funcionGastoCaja.findUnique({ where: { id: data.funcionGastoCajaId } }) : null,
      data.cuentaContableCajaId
        ? prisma.cuentaContableCaja.findUnique({ where: { id: data.cuentaContableCajaId } })
        : null,
      data.partidaPresupuestoId
        ? prisma.partidaPresupuestoCaja.findUnique({ where: { id: data.partidaPresupuestoId } })
        : null,
    ]);

    if (data.origen === "CAJA" && !caja) throw new HttpError("Caja chica no encontrada", 404);
    if (data.origen === "BANCO" && !cuentaBancariaCaja) throw new HttpError("Cuenta bancaria no encontrada", 404);
    if (data.centroCostoCajaId && !centroCosto) throw new HttpError("Centro de costo no encontrado", 404);
    if (data.funcionGastoCajaId && !funcionGasto) throw new HttpError("Función de gasto no encontrada", 404);
    if (data.cuentaContableCajaId && !cuentaManual) throw new HttpError("Cuenta contable no encontrada", 404);
    if (data.partidaPresupuestoId && !partidaPresupuesto) {
      throw new HttpError("Partida de presupuesto no encontrada", 404);
    }

    // No dejar registrar un gasto por más de lo que realmente hay disponible
    // — ni en la caja física, ni en la cuenta bancaria cuando el pago se
    // hace directo desde ahí.
    if (data.origen === "CAJA" && caja) {
      const estadoCuenta = await reportesCajaChicaService.getEstadoCuenta(caja.id);
      if (data.montoTotal > estadoCuenta.saldoActual) {
        throw new HttpError(
          `Fondos insuficientes: la caja "${caja.nombre}" tiene disponible ${estadoCuenta.saldoActual.toFixed(2)} y el gasto es de ${data.montoTotal.toFixed(2)}.`,
          409,
        );
      }
    }
    if (data.origen === "BANCO" && cuentaBancariaCaja) {
      if (data.moneda !== cuentaBancariaCaja.monedaBase) {
        throw new HttpError(
          `La cuenta "${cuentaBancariaCaja.nombreCuenta}" es en ${cuentaBancariaCaja.monedaBase}; registra el gasto en esa moneda.`,
          409,
        );
      }
      const { saldoActual } = await obtenerSaldoActualCuentaBancaria(cuentaBancariaCaja.id);
      if (data.montoTotal > saldoActual) {
        throw new HttpError(
          `Fondos insuficientes: la cuenta "${cuentaBancariaCaja.nombreCuenta}" tiene disponible ${saldoActual.toFixed(2)} ${cuentaBancariaCaja.monedaBase} y el gasto es de ${data.montoTotal.toFixed(2)}.`,
          409,
        );
      }
    }

    const impuestos = await calcularImpuestos(data);

    const gasto = await prisma.$transaction(async (tx) => {
      const creado = await tx.gastoCaja.create({
        data: {
          origen: data.origen,
          cajaId: data.origen === "CAJA" ? (data.cajaId ?? null) : null,
          cuentaBancariaCajaId: data.origen === "BANCO" ? (data.cuentaBancariaCajaId ?? null) : null,
          fecha: data.fecha,
          tipoDocumento: data.tipoDocumento,
          categoriaRetencion: data.categoriaRetencion ?? null,
          categoriaRendicion: data.categoriaRendicion,
          proveedorNombre: data.proveedorNombre,
          proveedorNitCi: data.proveedorNitCi ?? null,
          glosa: data.glosa,
          numeroRespaldo: data.numeroRespaldo ?? null,
          montoTotal: data.montoTotal,
          moneda: data.moneda,
          centroCostoCajaId: data.centroCostoCajaId ?? null,
          funcionGastoCajaId: data.funcionGastoCajaId ?? null,
          cuentaContableCajaId: data.cuentaContableCajaId ?? null,
          partidaPresupuestoId: data.partidaPresupuestoId ?? null,
          montoCreditoFiscalIva: impuestos.montoCreditoFiscalIva,
          montoRetencionRcIva: impuestos.montoRetencionRcIva,
          montoRetencionIueCompras: impuestos.montoRetencionIueCompras,
          montoRetencionIt: impuestos.montoRetencionIt,
          esNoDeducible: impuestos.esNoDeducible,
          usuarioId: userId,
        },
        include: INCLUDE_DETALLE,
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_GASTO_CAJA",
          data: { gastoId: creado.id, cajaId: data.cajaId, montoTotal: data.montoTotal },
        },
      });

      return creado;
    });

    logger.info({ userId, gastoId: gasto.id, action: "CREATE_GASTO_CAJA" }, "Gasto de caja registrado");

    return conInfoIncompleta(gasto);
  },

  // Solo se puede editar mientras esté REGISTRADO (ni RENDIDO — ya cerrado
  // en una rendición — ni ANULADO). Pensado sobre todo para completar
  // después el centro de costo/función de gasto/cuenta contable/partida de
  // presupuesto que quedaron sin llenar al registrar el gasto, pero permite
  // corregir cualquier otro dato. Si cambia el monto (o el tipo de
  // documento/categoría de retención), se recalculan los impuestos; si
  // cambia el monto, se revalida contra los fondos disponibles.
  async update(id: string, data: UpdateGastoCajaDTO, userId: number) {
    const existente = await prisma.gastoCaja.findUnique({ where: { id } });
    if (!existente) throw new HttpError("Gasto no encontrado", 404);
    if (existente.estado === "ANULADO") throw new HttpError("No se puede editar un gasto anulado", 409);
    if (existente.estado === "RENDIDO") {
      throw new HttpError("No se puede editar un gasto ya incluido en una rendición cerrada", 409);
    }

    const merged = {
      tipoDocumento: data.tipoDocumento ?? existente.tipoDocumento,
      categoriaRetencion:
        data.categoriaRetencion !== undefined ? data.categoriaRetencion : existente.categoriaRetencion,
      montoTotal: data.montoTotal ?? Number(existente.montoTotal),
      numeroRespaldo: data.numeroRespaldo !== undefined ? data.numeroRespaldo : existente.numeroRespaldo,
    };
    if (merged.tipoDocumento === "CONTRATO_RETENCION" && !merged.categoriaRetencion) {
      throw new HttpError("categoriaRetencion es obligatoria cuando el tipo de documento es CONTRATO_RETENCION", 400);
    }
    if (["FACTURA", "RECIBO"].includes(merged.tipoDocumento) && !merged.numeroRespaldo?.trim()) {
      throw new HttpError("El número de factura/recibo es obligatorio para este tipo de documento", 400);
    }

    const [centroCosto, funcionGasto, cuentaManual, partidaPresupuesto] = await Promise.all([
      data.centroCostoCajaId ? prisma.centroCostoCaja.findUnique({ where: { id: data.centroCostoCajaId } }) : null,
      data.funcionGastoCajaId ? prisma.funcionGastoCaja.findUnique({ where: { id: data.funcionGastoCajaId } }) : null,
      data.cuentaContableCajaId
        ? prisma.cuentaContableCaja.findUnique({ where: { id: data.cuentaContableCajaId } })
        : null,
      data.partidaPresupuestoId
        ? prisma.partidaPresupuestoCaja.findUnique({ where: { id: data.partidaPresupuestoId } })
        : null,
    ]);
    if (data.centroCostoCajaId && !centroCosto) throw new HttpError("Centro de costo no encontrado", 404);
    if (data.funcionGastoCajaId && !funcionGasto) throw new HttpError("Función de gasto no encontrada", 404);
    if (data.cuentaContableCajaId && !cuentaManual) throw new HttpError("Cuenta contable no encontrada", 404);
    if (data.partidaPresupuestoId && !partidaPresupuesto) {
      throw new HttpError("Partida de presupuesto no encontrada", 404);
    }

    // Si el monto cambia, hay que revalidar fondos — pero el saldo actual ya
    // descontó el monto VIEJO de este mismo gasto, así que hay que devolverlo
    // antes de comparar (si no, se compara contra un disponible falsamente bajo).
    if (data.montoTotal !== undefined && data.montoTotal !== Number(existente.montoTotal)) {
      if (existente.origen === "CAJA" && existente.cajaId) {
        const caja = await prisma.cajaChica.findUnique({ where: { id: existente.cajaId } });
        const estadoCuenta = await reportesCajaChicaService.getEstadoCuenta(existente.cajaId);
        const disponibleParaEdicion = estadoCuenta.saldoActual + Number(existente.montoTotal);
        if (data.montoTotal > disponibleParaEdicion) {
          throw new HttpError(
            `Fondos insuficientes: la caja "${caja?.nombre}" tiene disponible ${disponibleParaEdicion.toFixed(2)} (contando lo que libera este mismo gasto) y el nuevo monto es ${data.montoTotal.toFixed(2)}.`,
            409,
          );
        }
      } else if (existente.origen === "BANCO" && existente.cuentaBancariaCajaId) {
        const { cuenta, saldoActual } = await obtenerSaldoActualCuentaBancaria(existente.cuentaBancariaCajaId);
        const disponibleParaEdicion = saldoActual + Number(existente.montoTotal);
        if (data.montoTotal > disponibleParaEdicion) {
          throw new HttpError(
            `Fondos insuficientes: la cuenta "${cuenta.nombreCuenta}" tiene disponible ${disponibleParaEdicion.toFixed(2)} (contando lo que libera este mismo gasto) y el nuevo monto es ${data.montoTotal.toFixed(2)}.`,
            409,
          );
        }
      }
    }

    const impuestos = await calcularImpuestos(merged);

    // Mismo patrón que partidaPresupuestoCaja.service.ts: solo entran las
    // claves que de verdad vinieron en el payload (null explícito sí se
    // aplica, para poder "vaciar" un campo; undefined se omite del todo).
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as any;
    cleanData.montoCreditoFiscalIva = impuestos.montoCreditoFiscalIva;
    cleanData.montoRetencionRcIva = impuestos.montoRetencionRcIva;
    cleanData.montoRetencionIueCompras = impuestos.montoRetencionIueCompras;
    cleanData.montoRetencionIt = impuestos.montoRetencionIt;
    cleanData.esNoDeducible = impuestos.esNoDeducible;

    const gasto = await prisma.$transaction(async (tx) => {
      const actualizado = await tx.gastoCaja.update({
        where: { id },
        data: cleanData,
        include: INCLUDE_DETALLE,
      });

      await tx.log.create({
        data: { usuarioId: userId, accion: "UPDATE_GASTO_CAJA", data: { gastoId: id, ...data } },
      });

      return actualizado;
    });

    logger.info({ userId, gastoId: gasto.id, action: "UPDATE_GASTO_CAJA" }, "Gasto de caja actualizado");

    return conInfoIncompleta(gasto);
  },

  async anular(id: string, data: AnularGastoCajaDTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const gasto = await tx.gastoCaja.findUnique({ where: { id } });
      if (!gasto) throw new HttpError("Gasto no encontrado", 404);
      if (gasto.estado === "ANULADO") throw new HttpError("El gasto ya está anulado", 409);
      if (gasto.estado === "RENDIDO") {
        throw new HttpError("No se puede anular un gasto ya incluido en una rendición cerrada", 409);
      }

      const actualizado = await tx.gastoCaja.update({ where: { id }, data: { estado: "ANULADO" } });

      await tx.anulacionGastoCaja.create({
        data: { gastoId: id, usuarioId: userId, motivo: data.motivo },
      });

      await tx.log.create({
        data: { usuarioId: userId, accion: "ANULAR_GASTO_CAJA", data: { gastoId: id, motivo: data.motivo } },
      });

      return actualizado;
    });
  },
};
