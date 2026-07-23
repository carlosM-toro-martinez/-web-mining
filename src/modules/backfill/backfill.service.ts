import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

type ProductoResult = {
  productoId: number;
  movimientosActualizados: number;
  cppFinal: string;
};

async function procesarProductoMes(
  productoId: number,
  anio: number,
  mes: number,
): Promise<{ movs: number; saldoActualizado: boolean; cppFinal: string }> {
  const saldo = await (prisma.saldoMensual.findUnique as any)({
    where: { productoId_anio_mes: { productoId, anio, mes } },
  });

  if (!saldo) return { movs: 0, saldoActualizado: false, cppFinal: "0" };

  // Ventana temporal del mes (UTC)
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta  = new Date(Date.UTC(mes === 12 ? anio + 1 : anio, mes === 12 ? 0 : mes, 1));

  const movimientos = await prisma.movimiento.findMany({
    where: {
      productoId,
      OR: [
        { esRetroactivo: false, createdAt: { gte: desde, lt: hasta } },
        { esRetroactivo: true,  periodoAnio: anio, periodoMes: mes  },
      ],
    },
    orderBy: [
      { esRetroactivo: "desc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  if (movimientos.length === 0) {
    return { movs: 0, saldoActualizado: false, cppFinal: "0" };
  }

  const entradaCompraIds = [
    ...new Set(
      movimientos
        .filter(m => m.tipo === "ENTRADA" && m.referencia === "COMPRA" && m.referenciaId != null)
        .map(m => m.referenciaId as string),
    ),
  ];

  const compraItemsBatch = entradaCompraIds.length > 0
    ? await prisma.compraItem.findMany({
        where: { compraId: { in: entradaCompraIds }, productoId },
        select: { compraId: true, precioUnit: true, cantidadRecibida: true, compra: { select: { tieneIva: true } } },
      })
    : [];

  const ciMap         = new Map(compraItemsBatch.map((ci: any) => [ci.compraId, Number(ci.precioUnit)]));
  const ciTieneIvaMap = new Map(compraItemsBatch.map((ci: any) => [ci.compraId, (ci.compra?.tieneIva ?? true) as boolean]));

  const hayCompras = ciMap.size > 0;

  // CPP inicial: fuente depende de si este mes tiene compras propias.
  let cppInicialVal: number;

  if (hayCompras) {
    const prevMes   = mes === 1 ? 12 : mes - 1;
    const prevAnio  = mes === 1 ? anio - 1 : anio;
    const saldoPrev = await (prisma.saldoMensual.findUnique as any)({
      where: { productoId_anio_mes: { productoId, anio: prevAnio, mes: prevMes } },
    });
    cppInicialVal =
      Number(saldoPrev?.precioUnitProm ?? 0) > 0 ? Number(saldoPrev.precioUnitProm) :
      Number(saldoPrev?.precioUnit    ?? 0) > 0 ? Number(saldoPrev.precioUnit)    :
      Number(saldo.precioUnit         ?? 0) > 0 ? Number(saldo.precioUnit)        : 0;
  } else {
    cppInicialVal =
      Number(saldo.precioUnit     ?? 0) > 0 ? Number(saldo.precioUnit)     :
      Number(saldo.precioUnitProm ?? 0) > 0 ? Number(saldo.precioUnitProm) : 0;
  }

  // ── PASO 1: CPP periódico — acumula TODAS las compras del período de una vez.
  // Se itera compraItemsBatch (no movimientos) para obtener el total correcto cuando
  // una misma compra tiene múltiples ítems para el mismo producto a distintos precios.
  // El orden cronológico de los movimientos no afecta este cálculo.
  let totalCompraSinIva = new Prisma.Decimal(0);
  let totalCompraQty    = new Prisma.Decimal(0);
  let lastPrecioSinIva: Prisma.Decimal | null = null;

  for (const ci of compraItemsBatch) {
    const tieneIva    = ((ci as any).compra?.tieneIva ?? true) as boolean;
    const precioSinIva = new Prisma.Decimal((ci as any).precioUnit).mul(tieneIva ? "0.87" : "1");
    const qty         = new Prisma.Decimal((ci as any).cantidadRecibida);
    totalCompraSinIva = totalCompraSinIva.add(precioSinIva.mul(qty));
    totalCompraQty    = totalCompraQty.add(qty);
    lastPrecioSinIva  = precioSinIva;
  }

  const saldoInicialD = new Prisma.Decimal(saldo.saldoInicial ?? 0);
  const cppDecimal    = new Prisma.Decimal(cppInicialVal);
  const totalQperiodo = saldoInicialD.add(totalCompraQty);

  // CPP = (stockInicial × cppAnterior + Σ(qtyCopra × preciSinIva)) / (stockInicial + ΣqtyCompra)
  const periodCPP = totalQperiodo.isZero()
    ? cppDecimal
    : saldoInicialD.mul(cppDecimal).add(totalCompraSinIva).div(totalQperiodo);

  // ── PASO 2: Aplicar periodCPP a todos los movimientos manteniendo orden de fecha para stock ──
  let currentStock    = saldoInicialD;
  let movActualizados = 0;

  for (const mov of movimientos) {
    const qty = new Prisma.Decimal(mov.cantidad);

    if (mov.tipo === "ENTRADA" && mov.referencia === "COMPRA") {
      const precioConIva = ciMap.get(mov.referenciaId as string) ?? Number(mov.precioUnit);
      const tieneIva     = ciTieneIvaMap.get(mov.referenciaId as string) ?? true;
      const precioSinIva = new Prisma.Decimal(precioConIva).mul(tieneIva ? "0.87" : "1");
      const newStock     = currentStock.add(qty);

      await prisma.movimiento.update({
        where: { id: mov.id },
        data: {
          precioUnit: precioSinIva,
          entradaBs:  precioSinIva.mul(qty),
          saldoBs:    newStock.isNegative() ? new Prisma.Decimal(0) : newStock.mul(periodCPP),
        },
      });

      currentStock = newStock;
      movActualizados++;

    } else if (mov.tipo === "ENTRADA") {
      // ANULACION_VALE u otro: devuelve unidades al CPP periódico
      const newStock = currentStock.add(qty);

      await prisma.movimiento.update({
        where: { id: mov.id },
        data: {
          precioUnit: periodCPP,
          entradaBs:  periodCPP.mul(qty),
          saldoBs:    newStock.isNegative() ? new Prisma.Decimal(0) : newStock.mul(periodCPP),
        },
      });

      currentStock = newStock;
      movActualizados++;

    } else if (mov.tipo === "SALIDA") {
      const newStock = currentStock.sub(qty);
      const saldoBs  = newStock.isNegative()
        ? new Prisma.Decimal(0)
        : newStock.mul(periodCPP);

      await prisma.movimiento.update({
        where: { id: mov.id },
        data: {
          precioUnit: periodCPP,
          salidaBs:   periodCPP.mul(qty),
          saldoBs,
        },
      });

      currentStock = newStock;
      movActualizados++;
    }
  }

  // ── PASO 3: Actualizar SaldoMensual ─────────────────────────────────────────────────
  const saldoData: Record<string, unknown> = {
    precioUnitProm: periodCPP,
    totalBsProm:    currentStock.isNegative()
      ? new Prisma.Decimal(0)
      : currentStock.mul(periodCPP),
  };
  if (saldo.totalBsInicial == null && cppInicialVal > 0) {
    saldoData.totalBsInicial = saldoInicialD.mul(cppDecimal);
  }
  if (totalCompraQty.gt(0)) {
    saldoData.ingresosBs = totalCompraSinIva;
    saldoData.precioUnit = lastPrecioSinIva;
  }

  await prisma.saldoMensual.update({
    where: { productoId_anio_mes: { productoId, anio, mes } },
    data: saldoData,
  });

  return { movs: movActualizados, saldoActualizado: true, cppFinal: periodCPP.toFixed(6) };
}

export const backfillService = {
  async backfillCPP({ anio, mes }: { anio: number; mes: number }) {
    const saldos = await prisma.saldoMensual.findMany({
      where: { anio, mes },
      select: { productoId: true },
    });

    const productoIds = saldos.map(s => s.productoId);

    let totalMovs   = 0;
    let totalSaldos = 0;
    const detalle: ProductoResult[] = [];
    const errores: { productoId: number; error: string }[] = [];

    for (const productoId of productoIds) {
      try {
        const r = await procesarProductoMes(productoId, anio, mes);
        totalMovs += r.movs;
        if (r.saldoActualizado) totalSaldos++;
        detalle.push({ productoId, movimientosActualizados: r.movs, cppFinal: r.cppFinal });
      } catch (err) {
        errores.push({ productoId, error: String(err) });
      }
    }

    return {
      anio,
      mes,
      productosProcessados: productoIds.length,
      movimientosActualizados: totalMovs,
      saldosActualizados: totalSaldos,
      detalle,
      errores,
    };
  },
};
