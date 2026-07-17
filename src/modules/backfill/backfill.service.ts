import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

function calcularCPP(
  qAntes: Prisma.Decimal,
  precioPromExIva: Prisma.Decimal,
  qCompra: Prisma.Decimal,
  precioCompraExIva: Prisma.Decimal,
): Prisma.Decimal {
  const totalQ = qAntes.add(qCompra);
  if (totalQ.isZero()) return precioCompraExIva;
  return qAntes.mul(precioPromExIva).add(qCompra.mul(precioCompraExIva)).div(totalQ);
}

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
  const hasta = new Date(Date.UTC(mes === 12 ? anio + 1 : anio, mes === 12 ? 0 : mes, 1));

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

  // Consulta directa a CompraItem: fuente de verdad para saber si hubo compras reales.
  // Los IDs de compra vienen de los movimientos ENTRADA con referencia='COMPRA'.
  // No confiamos en el tipo de movimiento ni en cantidades — consultamos la tabla de compras.
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
        select: { compraId: true, precioUnit: true, compra: { select: { tieneIva: true } } },
      })
    : [];

  // ciMap: compraId → precioUnit CON IVA original (siempre desde CompraItem, nunca del movimiento)
  const ciMap        = new Map(compraItemsBatch.map((ci: any) => [ci.compraId, Number(ci.precioUnit)]));
  const ciTieneIvaMap = new Map(compraItemsBatch.map((ci: any) => [ci.compraId, (ci.compra?.tieneIva ?? true) as boolean]));

  // hayCompras: true solo si CompraItem devolvió registros reales para este período.
  // Evita que ANULACION_VALE (también ENTRADA) se confunda con una compra.
  const hayCompras = ciMap.size > 0;

  // CPP inicial: fuente depende de si este mes tiene compras propias.
  //
  // CON compras: usamos el precioUnitProm del mes anterior como base acumulada
  // (confiable si ese mes ya fue backfilleado; si no, fallback a precioUnit del mes anterior).
  //
  // SIN compras: el CPP no cambia. Usamos precioUnit del saldo actual (ya sin IVA,
  // confirmado), que es el precio de la última compra registrada. Evitamos heredar un
  // precioUnitProm corrupto del mes anterior generado por el código viejo.
  let cppInicialVal: number;

  if (hayCompras) {
    const prevMes  = mes === 1 ? 12 : mes - 1;
    const prevAnio = mes === 1 ? anio - 1 : anio;
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

  let currentCPP   = new Prisma.Decimal(cppInicialVal);
  let currentStock = new Prisma.Decimal(saldo.saldoInicial ?? 0);

  let movActualizados = 0;
  let totalIngresosBs = new Prisma.Decimal(0);
  let totalIngresoQty = new Prisma.Decimal(0);
  let lastPrecioSinIva: Prisma.Decimal | null = null;

  for (const mov of movimientos) {
    const qty = new Prisma.Decimal(mov.cantidad);

    if (mov.tipo === "ENTRADA" && mov.referencia === "COMPRA") {
      // Compra real: precio CON IVA de CompraItem → factor según tieneIva (idempotente)
      const precioConIva = ciMap.get(mov.referenciaId as string) ?? Number(mov.precioUnit);
      const tieneIva     = ciTieneIvaMap.get(mov.referenciaId as string) ?? true;
      const precioSinIva = new Prisma.Decimal(precioConIva).mul(tieneIva ? "0.87" : "1");

      const newCPP   = calcularCPP(currentStock, currentCPP, qty, precioSinIva);
      const newStock = currentStock.add(qty);

      await prisma.movimiento.update({
        where: { id: mov.id },
        data: {
          precioUnit: precioSinIva,
          entradaBs:  precioSinIva.mul(qty),
          saldoBs:    newStock.mul(newCPP),
        },
      });

      currentCPP   = newCPP;
      currentStock = newStock;
      totalIngresosBs = totalIngresosBs.add(precioSinIva.mul(qty));
      totalIngresoQty = totalIngresoQty.add(qty);
      lastPrecioSinIva = precioSinIva;
      movActualizados++;

    } else if (mov.tipo === "ENTRADA") {
      // ANULACION_VALE u otro: devuelve unidades al CPP actual (no altera el promedio).
      const newStock = currentStock.add(qty);

      await prisma.movimiento.update({
        where: { id: mov.id },
        data: {
          precioUnit: currentCPP,
          entradaBs:  currentCPP.mul(qty),
          saldoBs:    newStock.mul(currentCPP),
        },
      });

      currentStock = newStock;
      movActualizados++;

    } else if (mov.tipo === "SALIDA") {
      const newStock = currentStock.sub(qty);
      const saldoBs  = newStock.isNegative()
        ? new Prisma.Decimal(0)
        : newStock.mul(currentCPP);

      await prisma.movimiento.update({
        where: { id: mov.id },
        data: {
          precioUnit: currentCPP,
          salidaBs:   currentCPP.mul(qty),
          saldoBs,
        },
      });

      currentStock = newStock;
      movActualizados++;
    }
  }

  // Actualizar saldoMensual con el CPP final y totales correctos
  const saldoData: Record<string, unknown> = {
    precioUnitProm: currentCPP,
    totalBsProm:    currentStock.mul(currentCPP),
  };
  // Bloquear totalBsInicial la primera vez que corre el backfill para este mes.
  // Usa cppInicialVal (CPP heredado del mes anterior) × saldoInicial → precio correcto al inicio del mes.
  // En ejecuciones posteriores ya está seteado y no se vuelve a tocar.
  if (saldo.totalBsInicial == null && cppInicialVal > 0) {
    saldoData.totalBsInicial = new Prisma.Decimal(saldo.saldoInicial ?? 0).mul(new Prisma.Decimal(cppInicialVal));
  }
  if (totalIngresoQty.gt(0)) saldoData.ingresosBs = totalIngresosBs;
  if (lastPrecioSinIva)      saldoData.precioUnit  = lastPrecioSinIva;

  await prisma.saldoMensual.update({
    where: { productoId_anio_mes: { productoId, anio, mes } },
    data: saldoData,
  });

  return { movs: movActualizados, saldoActualizado: true, cppFinal: currentCPP.toFixed(6) };
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
