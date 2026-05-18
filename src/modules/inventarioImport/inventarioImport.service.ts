import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { parseCatalogoExcel } from "./inventarioImport.parser.js";
import type {
  CatalogoImportResult,
  SaldoMensualInput,
  SaldoMensualResult,
  StockInicialItem,
  StockInicialResult,
} from "./inventarioImport.types.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function findOrCreateCategoria(
  codigo: string,
  nombre: string,
  parentId: number | null,
): Promise<{ id: number; created: boolean }> {
  const existing = await prisma.categoriaInventario.findFirst({
    where: { codigo, parentId: parentId ?? null },
    select: { id: true },
  });
  if (existing) {
    if (nombre) {
      await prisma.categoriaInventario.update({ where: { id: existing.id }, data: { nombre } });
    }
    return { id: existing.id, created: false };
  }

  const created = await prisma.categoriaInventario.create({
    data: { codigo, nombre, parentId: parentId ?? null },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

// ─── Importar catálogo desde Excel ───────────────────────────────────────────

export async function importarCatalogo(
  buffer: Buffer,
  opciones?: { anio?: number; mes?: number },
): Promise<CatalogoImportResult> {
  const rows = parseCatalogoExcel(buffer);

  const result: CatalogoImportResult = {
    gruposCreados: 0,
    subGruposCreados: 0,
    productosCreados: 0,
    productosActualizados: 0,
    stockActualizados: 0,
    saldosMensualesCreados: 0,
    saldosMensualesActualizados: 0,
    warnings: [],
  };

  const grupoIndex = new Map<string, number>();
  const subGrupoIndex = new Map<string, number>();
  const cargarSaldo = !!(opciones?.anio && opciones?.mes);

  for (const row of rows) {
    // 1. Grupo
    if (!grupoIndex.has(row.groupCode)) {
      const { id, created } = await findOrCreateCategoria(row.groupCode, row.groupName, null);
      grupoIndex.set(row.groupCode, id);
      if (created) result.gruposCreados++;
    }

    const grupoId = grupoIndex.get(row.groupCode)!;

    // 2. Sub-grupo (solo si el Excel tiene nombre real para él)
    let categoriaId: number;
    if (row.subGroupName) {
      if (!subGrupoIndex.has(row.subGroupCode)) {
        const { id, created } = await findOrCreateCategoria(row.subGroupCode, row.subGroupName, grupoId);
        subGrupoIndex.set(row.subGroupCode, id);
        if (created) result.subGruposCreados++;
      }
      categoriaId = subGrupoIndex.get(row.subGroupCode)!;
    } else {
      // Sin sub-grupo → el producto va directo al grupo
      categoriaId = grupoId;
    }

    // 3. Crear o actualizar Producto
    const existing = await prisma.producto.findUnique({
      where: { codigo: row.productCode },
      select: { id: true },
    });

    let productoId: number;

    if (existing) {
      await prisma.producto.update({
        where: { id: existing.id },
        data: { nombre: row.productName, unidad: row.unidad, categoriaId },
      });
      result.productosActualizados++;
      productoId = existing.id;
    } else {
      const nuevo = await prisma.producto.create({
        data: {
          codigo: row.productCode,
          nombre: row.productName,
          unidad: row.unidad,
          categoriaId,
          esEpp: false,
        },
        select: { id: true },
      });
      result.productosCreados++;
      productoId = nuevo.id;
    }

    // 4. Upsert Stock (siempre que el Excel traiga cantidad o precio)
    if (row.cantidad !== undefined || row.precioUnit !== undefined) {
      const cantidad = row.cantidad ?? 0;
      const precio = row.precioUnit ?? 0;
      await prisma.stock.upsert({
        where: { productoId },
        update: { cantidad, precioUnit: precio, precioProm: precio },
        create: { productoId, cantidad, precioUnit: precio, precioProm: precio, cantidadReservada: 0 },
      });
      result.stockActualizados++;
    }

    // 5. Upsert SaldoMensual si se proporcionó anio+mes
    if (cargarSaldo && row.cantidad !== undefined) {
      const { anio, mes } = opciones!;
      const precio = row.precioUnit ?? 0;
      const totalBs = row.cantidad * precio;

      const saldoExistente = await prisma.saldoMensual.findUnique({
        where: { productoId_anio_mes: { productoId, anio: anio!, mes: mes! } },
        select: { id: true },
      });

      if (saldoExistente) {
        await prisma.saldoMensual.update({
          where: { id: saldoExistente.id },
          data: { saldoInicial: row.cantidad, ingresoQty: 0, salidaQty: 0, saldoFinal: row.cantidad, precioUnit: precio, totalBs },
        });
        result.saldosMensualesActualizados++;
      } else {
        await prisma.saldoMensual.create({
          data: { productoId, anio: anio!, mes: mes!, saldoInicial: row.cantidad, ingresoQty: 0, salidaQty: 0, saldoFinal: row.cantidad, precioUnit: precio, totalBs },
        });
        result.saldosMensualesCreados++;
      }
    }
  }

  if (rows.length === 0) {
    result.warnings.push("No se encontraron productos en el archivo. Verifica el formato.");
  }

  logger.info(result, "Catálogo de inventario importado");
  return result;
}

// ─── Carga de stock inicial ───────────────────────────────────────────────────

export async function cargarStockInicial(
  items: StockInicialItem[],
  userId: number,
): Promise<StockInicialResult> {
  const result: StockInicialResult = { actualizados: 0, noEncontrados: [] };

  for (const item of items) {
    const producto = await prisma.producto.findUnique({
      where: { codigo: item.productoCodigo },
      include: { stock: true },
    });

    if (!producto) {
      result.noEncontrados.push(item.productoCodigo);
      continue;
    }

    // Actualizar o crear Stock
    if (producto.stock) {
      await prisma.stock.update({
        where: { productoId: producto.id },
        data: {
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
          precioProm: item.precioUnit,
          cantidadReservada: 0,
        },
      });
    } else {
      await prisma.stock.create({
        data: {
          productoId: producto.id,
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
          precioProm: item.precioUnit,
          cantidadReservada: 0,
        },
      });
    }

    // Registrar movimiento de apertura para trazabilidad
    await prisma.movimiento.create({
      data: {
        operationId: `SALDO_INICIAL_${producto.id}_${Date.now()}`,
        productoId: producto.id,
        tipo: "ENTRADA",
        cantidad: item.cantidad,
        precioUnit: item.precioUnit,
        entradaBs: item.cantidad * item.precioUnit,
        salidaBs: 0,
        saldoBs: item.cantidad * item.precioUnit,
        stockAntes: 0,
        stockDespues: item.cantidad,
        usuarioId: userId,
        referencia: "SALDO_INICIAL",
      },
    });

    result.actualizados++;
  }

  logger.info({ actualizados: result.actualizados }, "Stock inicial cargado");
  return result;
}

// ─── Carga de saldo mensual histórico ────────────────────────────────────────

export async function cargarSaldoMensual(
  input: SaldoMensualInput,
  userId: number,
): Promise<SaldoMensualResult> {
  const { anio, mes, items } = input;
  const result: SaldoMensualResult = { creados: 0, actualizados: 0, noEncontrados: [] };

  for (const item of items) {
    const producto = await prisma.producto.findUnique({
      where: { codigo: item.productoCodigo },
      select: { id: true },
    });

    if (!producto) {
      result.noEncontrados.push(item.productoCodigo);
      continue;
    }

    const totalBs = item.saldoFinal * item.precioUnit;

    const existing = await prisma.saldoMensual.findUnique({
      where: { productoId_anio_mes: { productoId: producto.id, anio, mes } },
      select: { id: true },
    });

    if (existing) {
      await prisma.saldoMensual.update({
        where: { id: existing.id },
        data: {
          saldoInicial: item.saldoInicial,
          ingresoQty: item.ingresoQty,
          salidaQty: item.salidaQty,
          saldoFinal: item.saldoFinal,
          precioUnit: item.precioUnit,
          totalBs,
        },
      });
      result.actualizados++;
    } else {
      await prisma.saldoMensual.create({
        data: {
          productoId: producto.id,
          anio,
          mes,
          saldoInicial: item.saldoInicial,
          ingresoQty: item.ingresoQty,
          salidaQty: item.salidaQty,
          saldoFinal: item.saldoFinal,
          precioUnit: item.precioUnit,
          totalBs,
        },
      });
      result.creados++;
    }
  }

  await prisma.log.create({
    data: {
      usuarioId: userId,
      accion: "CARGAR_SALDO_MENSUAL",
      data: { anio, mes, creados: result.creados, actualizados: result.actualizados },
    },
  });

  logger.info({ anio, mes, ...result }, "Saldo mensual cargado");
  return result;
}

// ─── Consultar saldos mensuales cargados ────────────────────────────────────

export async function getSaldosMensualesCargados(anio: number, mes: number) {
  const registros = await prisma.saldoMensual.findMany({
    where: { anio, mes },
    include: {
      producto: {
        include: {
          categoria: { include: { parent: true } },
        },
      },
    },
    orderBy: { producto: { codigo: "asc" } },
  });

  return registros.map((r) => ({
    id: r.id,
    productoCodigo: r.producto.codigo,
    productoNombre: r.producto.nombre,
    unidad: r.producto.unidad,
    grupo: r.producto.categoria.parent?.nombre ?? r.producto.categoria.nombre,
    subGrupo: r.producto.categoria.parent ? r.producto.categoria.nombre : null,
    anio: r.anio,
    mes: r.mes,
    saldoInicial: Number(r.saldoInicial),
    ingresoQty: Number(r.ingresoQty),
    salidaQty: Number(r.salidaQty),
    saldoFinal: Number(r.saldoFinal),
    precioUnit: Number(r.precioUnit),
    totalBs: Number(r.totalBs),
  }));
}
