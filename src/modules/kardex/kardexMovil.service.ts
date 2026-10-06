import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../errors/http.error.js";
import { esMesCppMovil, inicioCppMovil } from "../../utils/cppMovil.js";
import {
  acumularSaldo,
  aplicarMovimiento,
  contadorPorMovimiento,
  esGasEspecialCompra,
  prorratearValor,
  redondearBs,
  redondearPrecio,
  valorEntradaCompra,
  type AcumuladoSaldo,
  type ContadorSaldo,
  type EstadoKardex,
  type ReglaValor,
  type ResultadoKardex,
} from "./kardexMovil.calc.js";

type D = Prisma.Decimal;
type Tx = Prisma.TransactionClient;
const Dec = Prisma.Decimal;
const CERO = new Dec(0);
const TIMEOUT_TX = { timeout: 120_000, maxWait: 20_000 };

type Periodo = { anio: number; mes: number };

const claveMes = (p: Periodo) => p.anio * 100 + p.mes;
const siguienteMes = (p: Periodo): Periodo => (p.mes === 12 ? { anio: p.anio + 1, mes: 1 } : { anio: p.anio, mes: p.mes + 1 });
const inicioMes = (p: Periodo) => new Date(Date.UTC(p.anio, p.mes - 1, 1));
const periodoDeFecha = (f: Date): Periodo => ({ anio: f.getUTCFullYear(), mes: f.getUTCMonth() + 1 });

function mesesDesde(desde: Periodo, hasta: Periodo): Periodo[] {
  const meses: Periodo[] = [];
  for (let p = desde; claveMes(p) <= claveMes(hasta); p = siguienteMes(p)) meses.push(p);
  return meses;
}

// Bloquea la fila de Stock del producto hasta el fin de la transacción: dos operaciones
// simultáneas sobre el mismo producto se encadenan en vez de partir del mismo saldo.
async function bloquearStock(tx: Tx, productoId: number) {
  await tx.$queryRaw`SELECT id FROM "Stock" WHERE "productoId" = ${productoId} FOR UPDATE`;
  const stock = await tx.stock.findUnique({ where: { productoId } });
  if (!stock) throw new HttpError(`El producto ${productoId} no tiene stock inicializado`, 400);
  return stock;
}

function estadoDesdeStock(stock: { cantidad: unknown; valorBs: unknown; precioProm: unknown }): EstadoKardex {
  return {
    cantidad: new Dec(stock.cantidad as string),
    valorBs: new Dec(stock.valorBs as string),
    ultimoCpp: new Dec(stock.precioProm as string),
  };
}

// ─── Valores de reverso ──────────────────────────────────────────────────────

export async function valorDevolucionVale(tx: Tx, valeId: string, productoId: number, cantidad: D): Promise<D> {
  const salidas = await tx.movimiento.findMany({
    where: { referencia: "VALE", referenciaId: valeId, productoId, tipo: "SALIDA" },
    select: { cantidad: true, salidaBs: true },
  });
  const qty = salidas.reduce((a, m) => a.add(m.cantidad), CERO);
  const bs = salidas.reduce((a, m) => a.add(m.salidaBs), CERO);
  return prorratearValor(bs, qty, cantidad);
}

export async function valorReversoCompra(tx: Tx, compraId: string, productoId: number, cantidad: D): Promise<D> {
  const entradas = await tx.movimiento.findMany({
    where: { referencia: "COMPRA", referenciaId: compraId, productoId, tipo: "ENTRADA" },
    select: { cantidad: true, entradaBs: true },
  });
  const qty = entradas.reduce((a, m) => a.add(m.cantidad), CERO);
  const bs = entradas.reduce((a, m) => a.add(m.entradaBs), CERO);
  return prorratearValor(bs, qty, cantidad);
}

// ─── Registro en tiempo real ─────────────────────────────────────────────────

export type MovimientoMovilInput = {
  productoId: number;
  tipo: "ENTRADA" | "SALIDA";
  cantidad: D | number | string;
  regla: ReglaValor;
  referencia?: string | null;
  referenciaId?: string | null;
  // Rechaza la salida si supera el stock físico (se verifica con el producto bloqueado).
  validarStock?: boolean;
  usuarioId: number;
  usuarioEntregaId?: number | null;
  usuarioRecibidoId?: number | null;
  cuentaId?: number | null;
  liberarReserva?: D | number | string;
  // Solo en compras: último precio de compra sin IVA (Stock.precioUnit y SaldoMensual.precioUnit).
  precioCompraSinIva?: D;
  include?: Prisma.MovimientoInclude;
};

// Se toma con el stock ya bloqueado y siempre posterior al último movimiento del producto,
// así el orden por createdAt es exactamente el orden de la cadena del kardex.
async function fechaMovimiento(tx: Tx, productoId: number): Promise<Date> {
  const ultimo = await tx.movimiento.findFirst({
    where: { productoId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const ahora = new Date();
  return ultimo && ultimo.createdAt.getTime() >= ahora.getTime() ? new Date(ultimo.createdAt.getTime() + 1) : ahora;
}

export async function registrarMovimientoMovil(tx: Tx, input: MovimientoMovilInput) {
  const stock = await bloquearStock(tx, input.productoId);
  const ahora = await fechaMovimiento(tx, input.productoId);
  const periodo = periodoDeFecha(ahora);
  if (!esMesCppMovil(periodo.anio, periodo.mes)) {
    throw new Error("registrarMovimientoMovil se llamó fuera de un mes con CPP móvil");
  }

  const cantidad = new Dec(input.cantidad);
  if (input.validarStock && input.tipo === "SALIDA" && new Dec(stock.cantidad).lt(cantidad)) {
    throw new HttpError(`Stock insuficiente para el producto ${input.productoId}. Disponible: ${stock.cantidad}, solicitado: ${cantidad}`, 409);
  }
  const { resultado, estado } = aplicarMovimiento(estadoDesdeStock(stock), cantidad, input.regla);

  const movimiento = await tx.movimiento.create({
    data: {
      operationId: randomUUID(),
      productoId: input.productoId,
      tipo: input.tipo,
      cantidad,
      precioUnit: resultado.precioUnit,
      entradaBs: resultado.entradaBs,
      salidaBs: resultado.salidaBs,
      saldoBs: resultado.valorDespues,
      stockAntes: resultado.stockAntes,
      stockDespues: resultado.stockDespues,
      usuarioId: input.usuarioId,
      usuarioEntregaId: input.usuarioEntregaId ?? null,
      usuarioRecibidoId: input.usuarioRecibidoId ?? null,
      cuentaId: input.cuentaId ?? null,
      referencia: input.referencia ?? null,
      referenciaId: input.referenciaId ?? null,
      createdAt: ahora,
    },
    ...(input.include ? { include: input.include } : {}),
  });

  const reserva = input.liberarReserva !== undefined
    ? Dec.max(Dec.min(new Dec(input.liberarReserva), new Dec(stock.cantidadReservada)), CERO)
    : CERO;

  await tx.stock.update({
    where: { productoId: input.productoId },
    data: {
      cantidad: estado.cantidad,
      valorBs: estado.valorBs,
      precioProm: estado.ultimoCpp,
      ...(input.precioCompraSinIva ? { precioUnit: input.precioCompraSinIva } : {}),
      ...(reserva.gt(0) ? { cantidadReservada: { decrement: reserva } } : {}),
    },
  });

  await actualizarSaldoMensualMovil(
    tx,
    input.productoId,
    periodo,
    contadorPorMovimiento(input.tipo, input.referencia ?? null),
    cantidad,
    resultado,
    estado,
    input.precioCompraSinIva,
  );

  return movimiento;
}

export function registrarMovimientoMovilTx(input: MovimientoMovilInput) {
  return prisma.$transaction((tx) => registrarMovimientoMovil(tx, input), TIMEOUT_TX);
}

export function conTransaccionKardex<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, TIMEOUT_TX);
}

async function actualizarSaldoMensualMovil(
  tx: Tx,
  productoId: number,
  periodo: Periodo,
  contador: ContadorSaldo,
  cantidad: D,
  resultado: ResultadoKardex,
  estado: EstadoKardex,
  precioCompraSinIva: D | undefined,
) {
  const where = { productoId_anio_mes: { productoId, anio: periodo.anio, mes: periodo.mes } };
  const saldo = await tx.saldoMensual.findUnique({ where });

  const previo: AcumuladoSaldo = saldo
    ? { ingresoQty: new Dec(saldo.ingresoQty), ingresosBs: new Dec(saldo.ingresosBs), salidaQty: new Dec(saldo.salidaQty) }
    : { ingresoQty: CERO, ingresosBs: CERO, salidaQty: CERO };
  const acc = acumularSaldo(previo, contador, cantidad, resultado);
  const saldoInicial = saldo ? new Dec(saldo.saldoInicial) : resultado.stockAntes;

  const data = {
    ingresoQty: acc.ingresoQty,
    ingresosBs: acc.ingresosBs,
    salidaQty: acc.salidaQty,
    saldoFinal: saldoInicial.add(acc.ingresoQty).sub(acc.salidaQty),
    totalBs: estado.valorBs,
    totalBsProm: estado.valorBs,
    precioUnitProm: estado.ultimoCpp,
    ...(precioCompraSinIva ? { precioUnit: precioCompraSinIva } : {}),
  };

  if (saldo) {
    await tx.saldoMensual.update({ where: { id: saldo.id }, data });
  } else {
    await tx.saldoMensual.create({
      data: {
        productoId,
        anio: periodo.anio,
        mes: periodo.mes,
        saldoInicial,
        precioUnit: precioCompraSinIva ?? estado.ultimoCpp,
        ...data,
      },
    });
  }
}

// ─── Recálculo completo de un producto ───────────────────────────────────────

export type ResultadoRecalculo = {
  productoId: number;
  codigo: string;
  nombre: string;
  movimientos: number;
  movimientosModificados: number;
  cantidadCadena: string;
  cantidadStock: string;
  cantidadCoincide: boolean;
  valorInicial: string;
  valorFinal: string;
  valorBsAnterior: string;
  salidasBsAntes: string;
  salidasBsDespues: string;
  aplicado: boolean;
  motivo?: string;
};

export type OpcionesRecalculo = { aplicar: boolean; sincronizarCantidad?: boolean };

// Primer mes que todavía puede recalcularse: el siguiente al último cierre con CPP móvil,
// o el mes de inicio si aún no se cerró ninguno.
export async function primerMesAbiertoCppMovil(): Promise<Periodo> {
  const inicio = inicioCppMovil();
  if (!inicio) throw new HttpError("El CPP móvil no está activo (CPP_MOVIL_DESDE)", 409);
  const cierres = await prisma.cierreMes.findMany({ select: { anio: true, mes: true } });
  const ultimo = cierres
    .filter((c) => claveMes(c) >= claveMes(inicio))
    .sort((a, b) => claveMes(b) - claveMes(a))[0];
  return ultimo ? siguienteMes(ultimo) : inicio;
}

export async function recalcularKardexProducto(productoId: number, desde: Periodo, opciones: OpcionesRecalculo) {
  if (!opciones.aplicar) return recalcularKardexProductoTx(prisma, productoId, desde, opciones);
  return prisma.$transaction((tx) => recalcularKardexProductoTx(tx, productoId, desde, opciones), TIMEOUT_TX);
}

// Repite toda la cadena del producto desde el saldo inicial de `desde` en orden cronológico,
// con las mismas reglas que el registro en tiempo real. Idempotente.
export async function recalcularKardexProductoTx(
  tx: Tx | typeof prisma,
  productoId: number,
  desde: Periodo,
  opciones: OpcionesRecalculo,
): Promise<ResultadoRecalculo> {
  if (!esMesCppMovil(desde.anio, desde.mes)) {
    throw new HttpError(`${desde.mes}/${desde.anio} no es un mes con CPP móvil`, 409);
  }
  const hoy = periodoDeFecha(new Date());
  const meses = mesesDesde(desde, hoy);
  const cerrados = await tx.cierreMes.findMany({
    where: { OR: meses.map((m) => ({ anio: m.anio, mes: m.mes })) },
    select: { anio: true, mes: true },
  });
  if (cerrados.length > 0) {
    const lista = cerrados.map((c) => `${c.mes}/${c.anio}`).join(", ");
    throw new HttpError(`No se puede recalcular el kardex: ${lista} ya está cerrado`, 409);
  }

  const producto = await tx.producto.findUnique({ where: { id: productoId }, select: { codigo: true, nombre: true } });
  if (!producto) throw new HttpError(`Producto ${productoId} no encontrado`, 404);

  const saldoDesde = await tx.saldoMensual.findUnique({
    where: { productoId_anio_mes: { productoId, anio: desde.anio, mes: desde.mes } },
  });

  let tieneStock = !!(await tx.stock.findUnique({ where: { productoId }, select: { id: true } }));
  // Producto con saldo en el libro pero sin fila de Stock: al sincronizar se le crea.
  if (!tieneStock && opciones.aplicar && opciones.sincronizarCantidad && saldoDesde && !new Dec(saldoDesde.saldoInicial).isZero()) {
    await (tx as Tx).stock.create({ data: { productoId, cantidad: 0, precioUnit: 0, precioProm: 0 } });
    tieneStock = true;
  }
  const stock = !tieneStock
    ? null
    : opciones.aplicar
      ? await bloquearStock(tx as Tx, productoId)
      : await tx.stock.findUnique({ where: { productoId } });
  const qtyInicial = saldoDesde ? new Dec(saldoDesde.saldoInicial) : CERO;
  const precioInicial = saldoDesde
    ? (new Dec(saldoDesde.precioUnitProm).gt(0) ? new Dec(saldoDesde.precioUnitProm) : new Dec(saldoDesde.precioUnit))
    : CERO;
  const valorInicial = saldoDesde?.totalBsInicial != null
    ? new Dec(saldoDesde.totalBsInicial)
    : redondearBs(qtyInicial.mul(precioInicial));

  const movimientos = await tx.movimiento.findMany({
    where: {
      productoId,
      OR: [
        { esRetroactivo: false, createdAt: { gte: inicioMes(desde) } },
        {
          esRetroactivo: true,
          OR: [{ periodoAnio: { gt: desde.anio } }, { periodoAnio: desde.anio, periodoMes: { gte: desde.mes } }],
        },
      ],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const compraIds = [...new Set(movimientos.filter((m) => m.referencia === "COMPRA" || m.referencia === "ANULACION_COMPRA").map((m) => m.referenciaId).filter((id): id is string => !!id))];
  const valeIds = [...new Set(movimientos.filter((m) => m.referencia === "ANULACION_VALE").map((m) => m.referenciaId).filter((id): id is string => !!id))];

  const [compraItems, entradasCompra, salidasVale] = await Promise.all([
    compraIds.length
      ? tx.compraItem.findMany({
          where: { compraId: { in: compraIds }, productoId },
          select: { compraId: true, precioUnit: true, totalBs: true, cantidadPedida: true, compra: { select: { tieneIva: true, esGasEspecial: true } } },
        })
      : Promise.resolve([]),
    compraIds.length
      ? tx.movimiento.findMany({
          where: { referencia: "COMPRA", referenciaId: { in: compraIds }, productoId, tipo: "ENTRADA" },
          select: { id: true, referenciaId: true, cantidad: true, entradaBs: true },
        })
      : Promise.resolve([]),
    valeIds.length
      ? tx.movimiento.findMany({
          where: { referencia: "VALE", referenciaId: { in: valeIds }, productoId, tipo: "SALIDA" },
          select: { id: true, referenciaId: true, cantidad: true, salidaBs: true },
        })
      : Promise.resolve([]),
  ]);

  const itemsPorCompra = new Map<string, typeof compraItems>();
  for (const ci of compraItems) {
    itemsPorCompra.set(ci.compraId, [...(itemsPorCompra.get(ci.compraId) ?? []), ci]);
  }
  // Valores ya recalculados en esta pasada (tienen prioridad sobre lo guardado).
  const nuevosValores = new Map<string, { entradaBs: D; salidaBs: D }>();
  const sumarRelacionados = (lista: Array<{ id: string; referenciaId: string | null; cantidad: unknown; entradaBs?: unknown; salidaBs?: unknown }>, refId: string, campo: "entradaBs" | "salidaBs") => {
    let qty = CERO;
    let bs = CERO;
    for (const m of lista) {
      if (m.referenciaId !== refId) continue;
      qty = qty.add(m.cantidad as string);
      bs = bs.add(nuevosValores.get(m.id)?.[campo] ?? new Dec(m[campo] as string));
    }
    return { qty, bs };
  };

  let estado: EstadoKardex = {
    cantidad: qtyInicial,
    valorBs: valorInicial,
    ultimoCpp: qtyInicial.gt(0) ? redondearPrecio(valorInicial.div(qtyInicial)) : precioInicial,
  };

  type PorMes = { acc: AcumuladoSaldo; estadoFinal: EstadoKardex | null; ultimoPrecioCompra: D | null };
  const porMes = new Map<number, PorMes>();
  let ultimoPrecioCompra: D | null = null;
  let salidasBsAntes = CERO;
  let salidasBsDespues = CERO;
  const updates: Array<{ id: string; data: Prisma.MovimientoUpdateInput }> = [];

  for (const mov of movimientos) {
    const cantidad = new Dec(mov.cantidad);
    const movPeriodo: Periodo = mov.esRetroactivo && mov.periodoAnio && mov.periodoMes
      ? { anio: mov.periodoAnio, mes: mov.periodoMes }
      : periodoDeFecha(mov.createdAt);

    let regla: ReglaValor;
    let precioCompra: D | null = null;
    if (mov.tipo === "ENTRADA") {
      let valor = new Dec(mov.entradaBs);
      if (mov.referencia === "COMPRA" && mov.referenciaId) {
        const items = itemsPorCompra.get(mov.referenciaId) ?? [];
        if (items.length === 1) {
          const item = items[0]!;
          valor = valorEntradaCompra({
            cantidad,
            precioUnit: new Dec(item.precioUnit),
            totalBs: item.totalBs != null ? new Dec(item.totalBs) : null,
            cantidadPedida: new Dec(item.cantidadPedida),
            tieneIva: item.compra.tieneIva,
            esGasEspecial: esGasEspecialCompra(item.compra.esGasEspecial, producto.codigo, movPeriodo.anio, movPeriodo.mes),
          });
        }
        precioCompra = redondearPrecio(valor.div(cantidad));
      } else if (mov.referencia === "ANULACION_VALE" && mov.referenciaId) {
        const { qty, bs } = sumarRelacionados(salidasVale, mov.referenciaId, "salidaBs");
        if (qty.gt(0)) valor = prorratearValor(bs, qty, cantidad);
      }
      regla = { tipo: "ENTRADA_VALOR", valorBs: valor };
    } else if (mov.referencia === "ANULACION_COMPRA" && mov.referenciaId) {
      const { qty, bs } = sumarRelacionados(entradasCompra, mov.referenciaId, "entradaBs");
      regla = { tipo: "SALIDA_VALOR", valorBs: qty.gt(0) ? prorratearValor(bs, qty, cantidad) : new Dec(mov.salidaBs) };
    } else {
      regla = { tipo: "SALIDA_CPP" };
    }

    const aplicado = aplicarMovimiento(estado, cantidad, regla);
    const r = aplicado.resultado;
    estado = aplicado.estado;
    nuevosValores.set(mov.id, { entradaBs: r.entradaBs, salidaBs: r.salidaBs });

    if (mov.tipo === "SALIDA" && mov.referencia !== "ANULACION_COMPRA") {
      salidasBsAntes = salidasBsAntes.add(mov.salidaBs);
      salidasBsDespues = salidasBsDespues.add(r.salidaBs);
    }

    const cambios =
      !r.precioUnit.eq(mov.precioUnit) ||
      !r.entradaBs.eq(mov.entradaBs) ||
      !r.salidaBs.eq(mov.salidaBs) ||
      !r.valorDespues.eq(mov.saldoBs) ||
      !r.stockAntes.eq(mov.stockAntes) ||
      !r.stockDespues.eq(mov.stockDespues);
    if (cambios) {
      updates.push({
        id: mov.id,
        data: {
          precioUnit: r.precioUnit,
          entradaBs: r.entradaBs,
          salidaBs: r.salidaBs,
          saldoBs: r.valorDespues,
          stockAntes: r.stockAntes,
          stockDespues: r.stockDespues,
        },
      });
    }

    const clave = claveMes(movPeriodo);
    const pm = porMes.get(clave) ?? { acc: { ingresoQty: CERO, ingresosBs: CERO, salidaQty: CERO }, estadoFinal: null, ultimoPrecioCompra: null };
    pm.acc = acumularSaldo(pm.acc, contadorPorMovimiento(mov.tipo, mov.referencia), cantidad, r);
    pm.estadoFinal = estado;
    if (precioCompra) {
      pm.ultimoPrecioCompra = precioCompra;
      ultimoPrecioCompra = precioCompra;
    }
    porMes.set(clave, pm);
  }

  const cantidadStock = stock ? new Dec(stock.cantidad) : CERO;
  const cantidadCoincide = estado.cantidad.eq(cantidadStock);
  const base: ResultadoRecalculo = {
    productoId,
    codigo: producto.codigo,
    nombre: producto.nombre,
    movimientos: movimientos.length,
    movimientosModificados: updates.length,
    cantidadCadena: estado.cantidad.toString(),
    cantidadStock: cantidadStock.toString(),
    cantidadCoincide,
    valorInicial: valorInicial.toString(),
    valorFinal: estado.valorBs.toString(),
    valorBsAnterior: stock ? new Dec(stock.valorBs).toString() : "0",
    salidasBsAntes: salidasBsAntes.toString(),
    salidasBsDespues: salidasBsDespues.toString(),
    aplicado: false,
  };

  if (!stock) {
    const vacio = movimientos.length === 0 && qtyInicial.isZero();
    return vacio
      ? { ...base, aplicado: opciones.aplicar }
      : { ...base, motivo: "Tiene saldo o movimientos pero no tiene registro de Stock" };
  }
  if (!opciones.aplicar) return base;
  if (!cantidadCoincide && !opciones.sincronizarCantidad) {
    return { ...base, motivo: "La cantidad del kardex no coincide con Stock.cantidad" };
  }

  const t = tx as Tx;
  for (const u of updates) {
    await t.movimiento.update({ where: { id: u.id }, data: u.data });
  }

  await t.stock.update({
    where: { productoId },
    data: {
      valorBs: estado.valorBs,
      precioProm: estado.ultimoCpp,
      ...(ultimoPrecioCompra ? { precioUnit: ultimoPrecioCompra } : {}),
      ...(!cantidadCoincide ? { cantidad: estado.cantidad } : {}),
    },
  });

  let saldoInicialMes = qtyInicial;
  let estadoMes: EstadoKardex = {
    cantidad: qtyInicial,
    valorBs: valorInicial,
    ultimoCpp: qtyInicial.gt(0) ? redondearPrecio(valorInicial.div(qtyInicial)) : precioInicial,
  };
  for (const m of meses) {
    const pm = porMes.get(claveMes(m));
    const acc = pm?.acc ?? { ingresoQty: CERO, ingresosBs: CERO, salidaQty: CERO };
    if (pm?.estadoFinal) estadoMes = pm.estadoFinal;
    const saldoFinal = saldoInicialMes.add(acc.ingresoQty).sub(acc.salidaQty);
    const where = { productoId_anio_mes: { productoId, anio: m.anio, mes: m.mes } };
    const existente = await t.saldoMensual.findUnique({ where, select: { id: true } });
    const data = {
      saldoInicial: saldoInicialMes,
      ingresoQty: acc.ingresoQty,
      ingresosBs: acc.ingresosBs,
      salidaQty: acc.salidaQty,
      saldoFinal,
      totalBs: estadoMes.valorBs,
      totalBsProm: estadoMes.valorBs,
      precioUnitProm: estadoMes.ultimoCpp,
      ...(pm?.ultimoPrecioCompra ? { precioUnit: pm.ultimoPrecioCompra } : {}),
    };
    if (existente) {
      await t.saldoMensual.update({ where: { id: existente.id }, data });
    } else if (pm || claveMes(m) === claveMes(desde)) {
      await t.saldoMensual.create({
        data: { productoId, anio: m.anio, mes: m.mes, precioUnit: pm?.ultimoPrecioCompra ?? estadoMes.ultimoCpp, ...data },
      });
    }
    saldoInicialMes = saldoFinal;
  }

  return { ...base, aplicado: true };
}
