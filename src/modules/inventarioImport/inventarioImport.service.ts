import { Prisma } from "@prisma/client";
import XLSX from "xlsx";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { parseCatalogoExcel } from "./inventarioImport.parser.js";
import { HttpError } from "../../errors/http.error.js";
import { verificarMesAbierto } from "../../utils/periodoRetroactivo.js";
import { productoService } from "../producto/producto.service.js";
import type {
  CatalogoImportResult,
  SaldoMensualInput,
  SaldoMensualResult,
  SaldoMensualItemInput,
  SaldoMensualItemResult,
  UpdateSaldoMensualItemInput,
  StockInicialItem,
  StockInicialResult,
  StockInicialItemInput,
  StockInicialItemResult,
  ProductoAutocompleteItem,
  ReiniciarStockResult,
  SincronizarStockResult,
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

async function resolveProductoId(
  productoId?: number,
  productoCodigo?: string,
): Promise<number> {
  if (productoId) {
    const p = await prisma.producto.findUnique({ where: { id: productoId }, select: { id: true } });
    if (!p) throw new HttpError(`Producto con id ${productoId} no encontrado`, 404);
    return p.id;
  }
  if (productoCodigo) {
    const p = await prisma.producto.findUnique({ where: { codigo: productoCodigo }, select: { id: true } });
    if (!p) throw new HttpError(`Producto con código "${productoCodigo}" no encontrado`, 404);
    return p.id;
  }
  throw new HttpError("Se requiere productoId o productoCodigo", 400);
}

function formatSaldoMensual(r: {
  id: string;
  productoId: number;
  anio: number;
  mes: number;
  saldoInicial: unknown;
  ingresoQty: unknown;
  salidaQty: unknown;
  saldoFinal: unknown;
  precioUnit: unknown;
  totalBs: unknown;
  producto: { codigo: string; nombre: string };
}): Omit<SaldoMensualItemResult, "accion"> {
  return {
    id: r.id,
    productoId: r.productoId,
    productoCodigo: r.producto.codigo,
    productoNombre: r.producto.nombre,
    anio: r.anio,
    mes: r.mes,
    saldoInicial: Number(r.saldoInicial),
    ingresoQty: Number(r.ingresoQty),
    salidaQty: Number(r.salidaQty),
    saldoFinal: Number(r.saldoFinal),
    precioUnit: Number(r.precioUnit),
    totalBs: Number(r.totalBs),
  };
}

// ─── Importar catálogo desde Excel ───────────────────────────────────────────
// Solo crea/actualiza Producto y categorías. Stock NO se toca.
// Si se pasan anio+mes, también graba SaldoMensual para ese período.

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

    // 2. Sub-grupo
    let categoriaId: number;
    if (row.subGroupName) {
      if (!subGrupoIndex.has(row.subGroupCode)) {
        const { id, created } = await findOrCreateCategoria(row.subGroupCode, row.subGroupName, grupoId);
        subGrupoIndex.set(row.subGroupCode, id);
        if (created) result.subGruposCreados++;
      }
      categoriaId = subGrupoIndex.get(row.subGroupCode)!;
    } else {
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

    // 4. Upsert SaldoMensual si se proporcionó anio+mes
    if (cargarSaldo && row.cantidad !== undefined) {
      const { anio, mes } = opciones!;
      await verificarMesAbierto(anio!, mes!);
      const precio = row.precioUnit ?? 0;
      const totalBs = row.cantidad * precio;

      const saldoExistente = await prisma.saldoMensual.findUnique({
        where: { productoId_anio_mes: { productoId, anio: anio!, mes: mes! } },
        select: { id: true },
      });

      if (saldoExistente) {
        await prisma.saldoMensual.update({
          where: { id: saldoExistente.id },
          data: {
            saldoInicial: row.cantidad,
            ingresoQty: 0,
            salidaQty: 0,
            saldoFinal: row.cantidad,
            precioUnit: precio,
            totalBs,
          },
        });
        result.saldosMensualesActualizados++;
      } else {
        await prisma.saldoMensual.create({
          data: {
            productoId,
            anio: anio!,
            mes: mes!,
            saldoInicial: row.cantidad,
            ingresoQty: 0,
            salidaQty: 0,
            saldoFinal: row.cantidad,
            precioUnit: precio,
            totalBs,
          },
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
// Primer registro de stock actual. Crea Movimiento tipo ENTRADA / SALDO_INICIAL.

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

// ─── Carga de saldo mensual histórico – batch ─────────────────────────────────

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

  logger.info({ anio, mes, ...result }, "Saldo mensual cargado (batch)");
  return result;
}

// ─── Saldo mensual – item individual (upsert) ────────────────────────────────

export async function upsertSaldoMensualItem(
  input: SaldoMensualItemInput,
  userId: number,
): Promise<SaldoMensualItemResult> {
  const productoId = await resolveProductoId(input.productoId, input.productoCodigo);
  const totalBs = input.saldoFinal * input.precioUnit;

  const existing = await prisma.saldoMensual.findUnique({
    where: { productoId_anio_mes: { productoId, anio: input.anio, mes: input.mes } },
    select: { id: true },
  });

  let record;
  let accion: "creado" | "actualizado";

  if (existing) {
    record = await prisma.saldoMensual.update({
      where: { id: existing.id },
      data: {
        saldoInicial: input.saldoInicial,
        ingresoQty: input.ingresoQty,
        salidaQty: input.salidaQty,
        saldoFinal: input.saldoFinal,
        precioUnit: input.precioUnit,
        totalBs,
      },
      include: { producto: { select: { codigo: true, nombre: true } } },
    });
    accion = "actualizado";
  } else {
    record = await prisma.saldoMensual.create({
      data: {
        productoId,
        anio: input.anio,
        mes: input.mes,
        saldoInicial: input.saldoInicial,
        ingresoQty: input.ingresoQty,
        salidaQty: input.salidaQty,
        saldoFinal: input.saldoFinal,
        precioUnit: input.precioUnit,
        totalBs,
      },
      include: { producto: { select: { codigo: true, nombre: true } } },
    });
    accion = "creado";
  }

  await prisma.log.create({
    data: {
      usuarioId: userId,
      accion: "UPSERT_SALDO_MENSUAL_ITEM",
      data: { productoId, anio: input.anio, mes: input.mes, accion },
    },
  });

  return { ...formatSaldoMensual(record), accion };
}

// ─── Saldo mensual – obtener por id ──────────────────────────────────────────

export async function getSaldoMensualById(id: string) {
  const record = await prisma.saldoMensual.findUnique({
    where: { id },
    include: {
      producto: {
        include: { categoria: { include: { parent: true } } },
      },
    },
  });

  if (!record) throw new HttpError("Registro de saldo mensual no encontrado", 404);

  return {
    id: record.id,
    productoId: record.productoId,
    productoCodigo: record.producto.codigo,
    productoNombre: record.producto.nombre,
    unidad: record.producto.unidad,
    grupo: record.producto.categoria.parent?.nombre ?? record.producto.categoria.nombre,
    subGrupo: record.producto.categoria.parent ? record.producto.categoria.nombre : null,
    anio: record.anio,
    mes: record.mes,
    saldoInicial: Number(record.saldoInicial),
    ingresoQty: Number(record.ingresoQty),
    salidaQty: Number(record.salidaQty),
    saldoFinal: Number(record.saldoFinal),
    precioUnit: Number(record.precioUnit),
    totalBs: Number(record.totalBs),
    totalBsInicial: (record as any).totalBsInicial !== null && (record as any).totalBsInicial !== undefined
      ? Number((record as any).totalBsInicial)
      : null,
  };
}

// ─── Saldo mensual – actualizar por id ───────────────────────────────────────

export async function updateSaldoMensualItem(
  id: string,
  data: UpdateSaldoMensualItemInput,
  userId: number,
): Promise<SaldoMensualItemResult> {
  const existing = await prisma.saldoMensual.findUnique({
    where: { id },
    select: {
      id: true,
      anio: true,
      mes: true,
      saldoInicial: true,
      ingresoQty: true,
      salidaQty: true,
      saldoFinal: true,
      precioUnit: true,
    },
  });
  if (!existing) throw new HttpError("Registro de saldo mensual no encontrado", 404);
  await verificarMesAbierto(existing.anio, existing.mes);

  const newSaldoInicial = data.saldoInicial !== undefined ? data.saldoInicial : Number(existing.saldoInicial);
  const newIngresoQty = data.ingresoQty !== undefined ? data.ingresoQty : Number(existing.ingresoQty);
  const newSalidaQty = data.salidaQty !== undefined ? data.salidaQty : Number(existing.salidaQty);
  // Auto-recalculate saldoFinal when saldoInicial/ingresoQty/salidaQty change unless caller sets it explicitly
  const saldoFinal = data.saldoFinal !== undefined
    ? data.saldoFinal
    : newSaldoInicial + newIngresoQty - newSalidaQty;
  const precioUnit = data.precioUnit !== undefined ? data.precioUnit : Number(existing.precioUnit);
  const totalBs = saldoFinal * precioUnit;

  const record = await prisma.saldoMensual.update({
    where: { id },
    data: {
      saldoInicial: newSaldoInicial,
      ingresoQty: newIngresoQty,
      salidaQty: newSalidaQty,
      saldoFinal,
      precioUnit,
      totalBs,
    },
    include: { producto: { select: { codigo: true, nombre: true } } },
  });

  await prisma.log.create({
    data: {
      usuarioId: userId,
      accion: "UPDATE_SALDO_MENSUAL_ITEM",
      data: JSON.parse(JSON.stringify({ id, cambios: data })),
    },
  });

  return { ...formatSaldoMensual(record), accion: "actualizado" };
}

// ─── Saldo mensual – ajuste de campos (ADMIN) ───────────────────────────────
// Permite corregir cualquier combinación de campos. Funciona en períodos cerrados.
// - precioUnit  → recalcula totalBs = saldoFinal × nuevo_precioUnit (si totalBs no se envía)
// - saldoInicial → recalcula saldoFinal y propaga el cambio a todos los meses siguientes

type CamposSaldoMensual = {
  totalBs?: number | undefined;
  totalBsProm?: number | undefined;
  totalBsInicial?: number | undefined;
  precioUnit?: number | undefined;
  saldoInicial?: number | undefined;
};

export async function ajustarCamposSaldoMensual(
  id: string,
  campos: CamposSaldoMensual,
  userId: number,
) {
  const existing = await (prisma.saldoMensual.findUnique as any)({
    where: { id },
    select: {
      id: true, anio: true, mes: true, productoId: true,
      saldoInicial: true, ingresoQty: true, salidaQty: true, saldoFinal: true,
      precioUnit: true, totalBs: true, totalBsProm: true, totalBsInicial: true,
      producto: { select: { codigo: true, nombre: true } },
    },
  }) as {
    id: string; anio: number; mes: number; productoId: number;
    saldoInicial: unknown; ingresoQty: unknown; salidaQty: unknown; saldoFinal: unknown;
    precioUnit: unknown; totalBs: unknown; totalBsProm: unknown; totalBsInicial: unknown;
    producto: { codigo: string; nombre: string };
  } | null;
  if (!existing) throw new HttpError("Registro de saldo mensual no encontrado", 404);

  const precioUnitActivo = campos.precioUnit !== undefined
    ? new Prisma.Decimal(campos.precioUnit)
    : new Prisma.Decimal(existing.precioUnit as number);

  const updateData: Record<string, unknown> = {};

  if (campos.precioUnit !== undefined)     updateData.precioUnit     = campos.precioUnit;
  if (campos.totalBsInicial !== undefined) updateData.totalBsInicial = campos.totalBsInicial;
  if (campos.totalBsProm !== undefined)    updateData.totalBsProm    = campos.totalBsProm;

  // saldoInicial → recalcular saldoFinal
  let newSaldoFinal: Prisma.Decimal;
  if (campos.saldoInicial !== undefined) {
    newSaldoFinal = new Prisma.Decimal(campos.saldoInicial)
      .add(existing.ingresoQty as number)
      .sub(existing.salidaQty as number);
    updateData.saldoInicial = campos.saldoInicial;
    updateData.saldoFinal   = newSaldoFinal;
  } else {
    newSaldoFinal = new Prisma.Decimal(existing.saldoFinal as number);
  }

  // totalBs: si se envía explícitamente lo respetamos; si no, recalculamos cuando cambió precioUnit o saldoInicial
  if (campos.totalBs !== undefined) {
    updateData.totalBs = campos.totalBs;
  } else if (campos.precioUnit !== undefined || campos.saldoInicial !== undefined) {
    updateData.totalBs = newSaldoFinal.mul(precioUnitActivo);
  }

  await (prisma.saldoMensual.update as any)({ where: { id }, data: updateData });

  // ── Cascade: propagar nuevo saldoFinal a los meses siguientes ──────────────
  let mesesCascadeados = 0;
  if (campos.saldoInicial !== undefined) {
    let prevFinal = newSaldoFinal;
    let cascAnio  = existing.anio;
    let cascMes   = existing.mes;

    for (let i = 0; i < 48; i++) {
      cascMes = cascMes === 12 ? 1 : cascMes + 1;
      if (cascMes === 1) cascAnio++;

      const next = await (prisma.saldoMensual.findUnique as any)({
        where: { productoId_anio_mes: { productoId: existing.productoId, anio: cascAnio, mes: cascMes } },
        select: { id: true, ingresoQty: true, salidaQty: true, precioUnit: true },
      }) as { id: string; ingresoQty: unknown; salidaQty: unknown; precioUnit: unknown } | null;

      if (!next) break;

      const nextFinal  = prevFinal.add(next.ingresoQty as number).sub(next.salidaQty as number);
      const nextTotalBs = nextFinal.mul(next.precioUnit as number);

      await (prisma.saldoMensual.update as any)({
        where: { id: next.id },
        data: { saldoInicial: prevFinal, saldoFinal: nextFinal, totalBs: nextTotalBs },
      });

      prevFinal = nextFinal;
      mesesCascadeados++;
    }
  }

  await prisma.log.create({
    data: {
      usuarioId: userId,
      accion: "AJUSTE_CAMPOS_SALDO_MENSUAL",
      data: JSON.parse(JSON.stringify({ id, campos, mesesCascadeados })),
    },
  });

  logger.info({ id, campos, mesesCascadeados }, "Ajuste campos saldo mensual");
  return {
    id,
    productoCodigo: existing.producto.codigo,
    productoNombre: existing.producto.nombre,
    anio: existing.anio,
    mes: existing.mes,
    camposActualizados: Object.keys(campos).filter(k => campos[k as keyof CamposSaldoMensual] !== undefined),
    mesesCascadeados,
  };
}

// Aliases para compatibilidad con el controller
export const ajustarTotalBsSaldoMensual        = (id: string, data: CamposSaldoMensual, userId: number) => ajustarCamposSaldoMensual(id, data, userId);
export const ajustarTotalBsInicialSaldoMensual = (id: string, totalBsInicial: number, userId: number)   => ajustarCamposSaldoMensual(id, { totalBsInicial }, userId);

// ─── Saldo mensual – ajuste masivo desde Excel ───────────────────────────────
// Columna obligatoria: "codigo" (código del producto)
// Columnas opcionales (cualquier combinación):
//   "totalBsInicial" — monto de apertura en Bs (override)
//   "precioUnit"     — precio unitario (recalcula totalBs automáticamente)
//   "saldoInicial"   — cantidad de apertura (recalcula saldoFinal + cascade)
// Los nombres de columna son insensibles a mayúsculas/tildes/espacios.
// Funciona en períodos cerrados. Solo ADMIN.

export interface AjusteInicialExcelFila {
  fila: number;
  codigo: string;
  campos: Record<string, number>;
  ok: boolean;
  error?: string;
}

function parseExcelNum(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const s = raw.trim().replace(/\s/g, "");
    // Detectar formato europeo: separador de miles "." y decimal ","
    // Patrón: dígitos con puntos cada 3 + coma final → europeo
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
      return parseFloat(s.replace(/\./g, "").replace(",", "."));
    }
    // Formato americano (comas como miles) o número simple
    return parseFloat(s.replace(/,/g, ""));
  }
  return NaN;
}

function normKey(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s_-]/g, "");
}

function findCol(row: Record<string, unknown>, ...aliases: string[]): unknown {
  const normAliases = aliases.map(normKey);
  for (const [key, val] of Object.entries(row)) {
    if (normAliases.includes(normKey(key))) return val;
  }
  return undefined;
}

export async function ajustarTotalBsInicialDesdeExcel(
  fileBuffer: Buffer,
  anio: number,
  mes: number,
  userId: number,
): Promise<{ procesados: number; exitosos: number; fallidos: number; resultados: AjusteInicialExcelFila[] }> {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) throw new HttpError("El archivo Excel está vacío o no tiene hojas", 400);

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (rows.length === 0) throw new HttpError("El Excel no contiene filas de datos", 400);

  const resultados: AjusteInicialExcelFila[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const fila = i + 2;

    const rawCodigo = findCol(row, "codigo", "cod", "code");
    const codigo = typeof rawCodigo === "string"
      ? rawCodigo.trim()
      : String(rawCodigo ?? "").trim();

    if (!codigo) {
      resultados.push({ fila, codigo: "", campos: {}, ok: false, error: "Falta el código de producto" });
      continue;
    }

    const campos: CamposSaldoMensual = {};

    const rawTotalBsInicial = findCol(row, "totalBsInicial", "total_bs_inicial", "totalBsinicial", "monto inicial");
    if (rawTotalBsInicial !== undefined) {
      const v = parseExcelNum(rawTotalBsInicial);
      if (isNaN(v) || v < 0) {
        resultados.push({ fila, codigo, campos: {}, ok: false, error: "totalBsInicial inválido o negativo" });
        continue;
      }
      campos.totalBsInicial = v;
    }

    const rawPrecioUnit = findCol(row, "precioUnit", "precio_unit", "preciounitario", "p. unit", "precio unitario", "precio");
    if (rawPrecioUnit !== undefined) {
      const v = parseExcelNum(rawPrecioUnit);
      if (isNaN(v) || v < 0) {
        resultados.push({ fila, codigo, campos: {}, ok: false, error: "precioUnit inválido (debe ser número >= 0)" });
        continue;
      }
      campos.precioUnit = v;
    }

    const rawSaldoInicial = findCol(row, "saldoInicial", "saldo_inicial", "saldoinicial", "saldo inicial", "cantidad inicial");
    if (rawSaldoInicial !== undefined) {
      const v = parseExcelNum(rawSaldoInicial);
      if (isNaN(v) || v < 0) {
        resultados.push({ fila, codigo, campos: {}, ok: false, error: "saldoInicial inválido o negativo" });
        continue;
      }
      campos.saldoInicial = Math.round(v);
    }

    if (Object.keys(campos).length === 0) {
      resultados.push({ fila, codigo, campos: {}, ok: false, error: "No se encontró ninguna columna de valor reconocida" });
      continue;
    }

    const saldo = await (prisma.saldoMensual.findFirst as any)({
      where: { anio, mes, producto: { codigo } },
      select: { id: true },
    }) as { id: string } | null;

    if (!saldo) {
      resultados.push({ fila, codigo, campos: {}, ok: false, error: `Sin registro para ${codigo} en ${mes}/${anio}` });
      continue;
    }

    await ajustarCamposSaldoMensual(saldo.id, campos, userId);

    resultados.push({ fila, codigo, campos: campos as Record<string, number>, ok: true });
  }

  const exitosos = resultados.filter(r => r.ok).length;
  const fallidos = resultados.length - exitosos;

  await prisma.log.create({
    data: {
      usuarioId: userId,
      accion: "AJUSTE_CAMPOS_EXCEL",
      data: { anio, mes, procesados: resultados.length, exitosos, fallidos },
    },
  });

  logger.info({ anio, mes, exitosos, fallidos }, "Ajuste masivo campos saldo mensual desde Excel");
  return { procesados: resultados.length, exitosos, fallidos, resultados };
}

// ─── Saldo mensual – eliminar por id ─────────────────────────────────────────

export async function deleteSaldoMensualItem(
  id: string,
  userId: number,
): Promise<{ id: string }> {
  const existing = await prisma.saldoMensual.findUnique({
    where: { id },
    select: { id: true, productoId: true, anio: true, mes: true },
  });
  if (!existing) throw new HttpError("Registro de saldo mensual no encontrado", 404);
  await verificarMesAbierto(existing.anio, existing.mes);

  await prisma.saldoMensual.delete({ where: { id } });

  await prisma.log.create({
    data: {
      usuarioId: userId,
      accion: "DELETE_SALDO_MENSUAL_ITEM",
      data: { id, productoId: existing.productoId, anio: existing.anio, mes: existing.mes },
    },
  });

  logger.info({ id }, "Saldo mensual eliminado");
  return { id };
}

// ─── Consultar saldos mensuales cargados ─────────────────────────────────────

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
    totalBsInicial: (r as any).totalBsInicial !== null && (r as any).totalBsInicial !== undefined
      ? Number((r as any).totalBsInicial)
      : null,
  }));
}

// ─── Autocomplete de productos ────────────────────────────────────────────────
// Busca por nombre O código (case-insensitive). Devuelve lista ligera para formularios.

export async function buscarProductosAutocomplete(
  q: string | undefined,
  limit: number,
): Promise<ProductoAutocompleteItem[]> {
  const where = q
    ? {
        OR: [
          { nombre: { contains: q, mode: "insensitive" as const } },
          { codigo: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const productos = await prisma.producto.findMany({
    where,
    take: limit,
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      unidad: true,
      categoria: { select: { nombre: true, parent: { select: { nombre: true } } } },
      stock: { select: { cantidad: true, precioUnit: true } },
    },
  });

  return productos.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    unidad: p.unidad,
    grupo: p.categoria.parent?.nombre ?? p.categoria.nombre,
    subGrupo: p.categoria.parent ? p.categoria.nombre : null,
    stockActual: Number(p.stock?.cantidad ?? 0),
    precioUnit: Number(p.stock?.precioUnit ?? 0),
  }));
}

// ─── Stock inicial – item individual con creación opcional ────────────────────
// Si se envía productoId → usa ese producto.
// Si se envía crearProducto → crea el producto y luego le asigna el stock.

export async function cargarStockInicialItem(
  item: StockInicialItemInput,
  userId: number,
): Promise<StockInicialItemResult> {
  let productoId: number;
  let productoCreado = false;

  if (item.productoId) {
    const p = await prisma.producto.findUnique({
      where: { id: item.productoId },
      select: { id: true },
    });
    if (!p) throw new HttpError(`Producto con id ${item.productoId} no encontrado`, 404);
    productoId = p.id;
  } else {
    // crearProducto is guaranteed by schema validation
    const datos = item.crearProducto!;
    const nuevo = await productoService.create(
      {
        codigo: datos.codigo,
        nombre: datos.nombre,
        unidad: datos.unidad,
        grupoId: datos.grupoId,
        subgrupoId: datos.subgrupoId,
        centroCostoId: datos.centroCostoId,
        funcionGastoId: datos.funcionGastoId,
        esEpp: datos.esEpp,
      },
      userId,
    );
    productoId = nuevo!.id;
    productoCreado = true;
  }

  const stockExistente = await prisma.stock.findUnique({
    where: { productoId },
    select: { id: true },
  });

  let stockAccion: "creado" | "actualizado";

  if (stockExistente) {
    await prisma.stock.update({
      where: { productoId },
      data: {
        cantidad: item.cantidad,
        precioUnit: item.precioUnit,
        precioProm: item.precioUnit,
        cantidadReservada: 0,
      },
    });
    stockAccion = "actualizado";
  } else {
    await prisma.stock.create({
      data: {
        productoId,
        cantidad: item.cantidad,
        precioUnit: item.precioUnit,
        precioProm: item.precioUnit,
        cantidadReservada: 0,
      },
    });
    stockAccion = "creado";
  }

  await prisma.movimiento.create({
    data: {
      operationId: `SALDO_INICIAL_${productoId}_${Date.now()}`,
      productoId,
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

  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    select: { codigo: true, nombre: true },
  });

  logger.info({ productoId, productoCreado, stockAccion }, "Stock inicial item cargado");

  return {
    productoId,
    productoCodigo: producto!.codigo,
    productoNombre: producto!.nombre,
    cantidad: item.cantidad,
    precioUnit: item.precioUnit,
    stockAccion,
    productoCreado,
  };
}

// ─── Reiniciar stock ──────────────────────────────────────────────────────────
// Elimina todos los registros de Stock. Usar antes de cargarStockInicial.

export async function reiniciarStock(userId: number): Promise<ReiniciarStockResult> {
  const { count } = await prisma.stock.deleteMany({});

  await prisma.log.create({
    data: {
      usuarioId: userId,
      accion: "REINICIAR_STOCK",
      data: { eliminados: count },
    },
  });

  logger.warn({ eliminados: count, usuarioId: userId }, "Stock reiniciado");
  return { eliminados: count };
}

// ─── Sincronizar stock desde SaldoMensual ────────────────────────────────────
// Calcula Stock.cantidad y Stock.precioUnit a partir del SaldoMensual más
// reciente de cada producto (o del período específico si se indica).

export async function sincronizarStockDesdeSaldoMensual(
  opciones: { anio?: number | undefined; mes?: number | undefined },
  userId: number,
): Promise<SincronizarStockResult> {
  const result: SincronizarStockResult = { actualizados: 0, creados: 0, sinSaldo: 0 };

  const productos = await prisma.producto.findMany({
    select: { id: true },
  });

  for (const { id: productoId } of productos) {
    let saldo;

    if (opciones.anio && opciones.mes) {
      saldo = await prisma.saldoMensual.findUnique({
        where: { productoId_anio_mes: { productoId, anio: opciones.anio, mes: opciones.mes } },
        select: { saldoFinal: true, precioUnit: true },
      });
    } else {
      saldo = await prisma.saldoMensual.findFirst({
        where: { productoId },
        orderBy: [{ anio: "desc" }, { mes: "desc" }],
        select: { saldoFinal: true, precioUnit: true },
      });
    }

    if (!saldo) {
      result.sinSaldo++;
      continue;
    }

    const cantidad = Number(saldo.saldoFinal);
    const precioUnit = Number(saldo.precioUnit);

    const stockExistente = await prisma.stock.findUnique({
      where: { productoId },
      select: { id: true },
    });

    if (stockExistente) {
      await prisma.stock.update({
        where: { productoId },
        data: { cantidad, precioUnit, precioProm: precioUnit },
      });
      result.actualizados++;
    } else {
      await prisma.stock.create({
        data: { productoId, cantidad, precioUnit, precioProm: precioUnit, cantidadReservada: 0 },
      });
      result.creados++;
    }
  }

  await prisma.log.create({
    data: {
      usuarioId: userId,
      accion: "SINCRONIZAR_STOCK_DESDE_SALDO",
      data: { opciones, ...result },
    },
  });

  logger.info({ opciones, ...result }, "Stock sincronizado desde SaldoMensual");
  return result;
}

// ─── Inicializar período ─────────────────────────────────────────────────────
// Siembra/actualiza SaldoMensual para TODOS los productos de un mes usando el
// saldoFinal del mes anterior (o Stock actual, o 0) como saldoInicial.
// Si el registro ya existe (creado automáticamente por un movimiento retroactivo),
// actualiza saldoInicial y recalcula saldoFinal = saldoInicial + ingresoQty - salidaQty.
// También recalcula la cadena stockAntes/stockDespues de los movimientos retroactivos
// del período para que el bincard muestre valores correctos de inmediato.

export async function inicializarPeriodo(anio: number, mes: number) {
  await verificarMesAbierto(anio, mes);

  const mesPrev = mes === 1 ? 12 : mes - 1;
  const anioPrev = mes === 1 ? anio - 1 : anio;

  const productos = await prisma.producto.findMany({
    select: { id: true, stock: { select: { cantidad: true, precioUnit: true } } },
  });

  let creados = 0;
  let actualizados = 0;

  for (const producto of productos) {
    const previo = await (prisma.saldoMensual.findUnique as any)({
      where: { productoId_anio_mes: { productoId: producto.id, anio: anioPrev, mes: mesPrev } },
      select: { saldoFinal: true, precioUnit: true, precioUnitProm: true },
    }) as { saldoFinal: Prisma.Decimal; precioUnit: Prisma.Decimal; precioUnitProm: Prisma.Decimal } | null;

    let saldoInicial:   Prisma.Decimal;
    let precioUnit:     Prisma.Decimal;
    let precioUnitProm: Prisma.Decimal;

    if (previo) {
      saldoInicial   = new Prisma.Decimal(previo.saldoFinal);
      precioUnit     = new Prisma.Decimal(previo.precioUnit);
      precioUnitProm = new Prisma.Decimal(previo.precioUnitProm ?? previo.precioUnit);
    } else if (producto.stock) {
      saldoInicial   = new Prisma.Decimal(producto.stock.cantidad);
      precioUnit     = new Prisma.Decimal(producto.stock.precioUnit);
      precioUnitProm = new Prisma.Decimal(producto.stock.precioUnit);
    } else {
      saldoInicial   = new Prisma.Decimal(0);
      precioUnit     = new Prisma.Decimal(0);
      precioUnitProm = new Prisma.Decimal(0);
    }

    const yaExiste = await (prisma.saldoMensual.findUnique as any)({
      where: { productoId_anio_mes: { productoId: producto.id, anio, mes } },
      select: { id: true, ingresoQty: true, salidaQty: true, ingresosBs: true },
    }) as { id: string; ingresoQty: Prisma.Decimal; salidaQty: Prisma.Decimal; ingresosBs: Prisma.Decimal } | null;

    if (yaExiste) {
      const saldoFinal = saldoInicial
        .add(new Prisma.Decimal(yaExiste.ingresoQty))
        .sub(new Prisma.Decimal(yaExiste.salidaQty));
      // Recalcular promedio con los ingresosBs ya acumulados
      const ingresosBs   = new Prisma.Decimal(yaExiste.ingresosBs ?? 0);
      const ingresoQty   = new Prisma.Decimal(yaExiste.ingresoQty);
      const precioPromAct = ingresoQty.gt(0) ? ingresosBs.div(ingresoQty) : precioUnitProm;
      await (prisma.saldoMensual.update as any)({
        where: { id: yaExiste.id },
        data: {
          saldoInicial,
          saldoFinal,
          precioUnit,
          totalBs:        saldoFinal.mul(precioUnit),
          precioUnitProm: precioPromAct,
          totalBsProm:    saldoFinal.mul(precioPromAct),
        },
      });
      actualizados++;
    } else {
      await (prisma.saldoMensual.create as any)({
        data: {
          productoId:     producto.id,
          anio,
          mes,
          saldoInicial,
          ingresoQty:     0,
          salidaQty:      0,
          saldoFinal:     saldoInicial,
          precioUnit,
          totalBs:        saldoInicial.mul(precioUnit),
          ingresosBs:     0,
          precioUnitProm,
          totalBsProm:    saldoInicial.mul(precioUnitProm),
        },
      });
      creados++;
    }
  }

  // Recalculate stockAntes/stockDespues chain for any retroactive movements already
  // registered in this period so the bin-card is immediately correct.
  let movimientosRecalculados = 0;
  const productosConRetroactivos = await prisma.movimiento.groupBy({
    by: ["productoId"],
    where: { esRetroactivo: true, periodoAnio: anio, periodoMes: mes },
  });

  for (const { productoId } of productosConRetroactivos) {
    const saldoDelMes = await prisma.saldoMensual.findUnique({
      where: { productoId_anio_mes: { productoId, anio, mes } },
      select: { saldoInicial: true, precioUnit: true },
    });

    const retroactivos = await prisma.movimiento.findMany({
      where: { productoId, esRetroactivo: true, periodoAnio: anio, periodoMes: mes },
      orderBy: { createdAt: "asc" },
    });

    let balance = saldoDelMes
      ? new Prisma.Decimal(saldoDelMes.saldoInicial)
      : new Prisma.Decimal(0);

    for (const mov of retroactivos) {
      const antes = balance;
      balance = mov.tipo === "ENTRADA" ? balance.add(mov.cantidad) : balance.sub(mov.cantidad);
      const precioU = new Prisma.Decimal(mov.precioUnit);
      await prisma.movimiento.update({
        where: { id: mov.id },
        data: {
          stockAntes: antes,
          stockDespues: balance,
          saldoBs: balance.mul(precioU),
          entradaBs: mov.tipo === "ENTRADA" ? precioU.mul(mov.cantidad) : 0,
          salidaBs: mov.tipo === "SALIDA" ? precioU.mul(mov.cantidad) : 0,
        },
      });
      movimientosRecalculados++;
    }
  }

  logger.info({ anio, mes, creados, actualizados, movimientosRecalculados }, "Período inicializado");
  return { anio, mes, creados, actualizados, movimientosRecalculados };
}

// ─── Cerrar mes ──────────────────────────────────────────────────────────────
// Consolida los movimientos del mes en SaldoMensual y bloquea el período.

export async function cerrarMes(anio: number, mes: number, userId: number) {
  const existing = await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } });
  if (existing) throw new HttpError(`El período ${mes}/${anio} ya está cerrado`, 409);

  const mesInicio = new Date(anio, mes - 1, 1);
  const mesFin = new Date(anio, mes, 1);

  const cierreMovWhere = {
    OR: [
      { createdAt: { gte: mesInicio, lt: mesFin }, esRetroactivo: false as const },
      { esRetroactivo: true as const, periodoAnio: anio, periodoMes: mes },
    ],
  };

  const [movsRaw, anulacionValeMovsCierre] = await Promise.all([
    prisma.movimiento.findMany({
      where: cierreMovWhere,
      select: { productoId: true, tipo: true, cantidad: true, precioUnit: true, referencia: true, referenciaId: true },
    }),
    prisma.movimiento.findMany({
      where: { referencia: "ANULACION_VALE", ...cierreMovWhere },
      select: { referenciaId: true },
    }),
  ]);

  const valesAnuladosIdsCierre = new Set(
    anulacionValeMovsCierre.map(m => m.referenciaId).filter((id): id is string => id !== null),
  );
  // Excluir: ANULACION_VALE ENTRADAs (no son compras reales) y SALIDAs de vales anulados
  const movs = movsRaw.filter(m => {
    if (m.referencia === "ANULACION_VALE") return false;
    if (m.tipo === "SALIDA" && m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIdsCierre.has(m.referenciaId)) return false;
    return true;
  });

  const byProducto = new Map<number, { ingresoQty: Prisma.Decimal; salidaQty: Prisma.Decimal; precioUnit: Prisma.Decimal; ingresosBs: Prisma.Decimal }>();
  for (const mov of movs) {
    const e = byProducto.get(mov.productoId) ?? {
      ingresoQty: new Prisma.Decimal(0),
      salidaQty:  new Prisma.Decimal(0),
      precioUnit: new Prisma.Decimal(mov.precioUnit),
      ingresosBs: new Prisma.Decimal(0),
    };
    if (mov.tipo === "ENTRADA") {
      const precioSinIva = new Prisma.Decimal(mov.precioUnit).mul('0.87');
      e.ingresoQty = e.ingresoQty.add(mov.cantidad);
      e.precioUnit = precioSinIva;
      e.ingresosBs = e.ingresosBs.add(precioSinIva.mul(mov.cantidad));
    } else {
      e.salidaQty = e.salidaQty.add(mov.cantidad);
    }
    byProducto.set(mov.productoId, e);
  }

  const productoIds = [...byProducto.keys()];
  let saldosCreados = 0;
  let saldosActualizados = 0;

  for (const productoId of productoIds) {
    const { ingresoQty, salidaQty, precioUnit, ingresosBs } = byProducto.get(productoId)!;

    const mesPrev = mes === 1 ? 12 : mes - 1;
    const anioPrev = mes === 1 ? anio - 1 : anio;
    const saldoPrev = await (prisma.saldoMensual.findUnique as any)({
      where: { productoId_anio_mes: { productoId, anio: anioPrev, mes: mesPrev } },
      select: { saldoFinal: true, precioUnit: true, precioUnitProm: true },
    }) as { saldoFinal: Prisma.Decimal; precioUnit: Prisma.Decimal; precioUnitProm: Prisma.Decimal } | null;

    const saldoInicial   = saldoPrev ? new Prisma.Decimal(saldoPrev.saldoFinal) : new Prisma.Decimal(0);
    const precioCierre   = saldoPrev ? new Prisma.Decimal(saldoPrev.precioUnit) : precioUnit; // último precio
    const saldoFinal     = saldoInicial.add(ingresoQty).sub(salidaQty);
    const totalBs        = saldoFinal.mul(precioCierre);
    // Promedio ponderado de este mes (todas las entradas del período)
    const precioUnitProm = ingresoQty.gt(0) ? ingresosBs.div(ingresoQty) : precioCierre;
    const totalBsProm    = saldoFinal.mul(precioUnitProm);

    const saldoExistente = await prisma.saldoMensual.findUnique({
      where: { productoId_anio_mes: { productoId, anio, mes } },
    });

    if (saldoExistente) {
      await (prisma.saldoMensual.update as any)({
        where: { productoId_anio_mes: { productoId, anio, mes } },
        data: { saldoInicial, ingresoQty, salidaQty, saldoFinal, precioUnit: precioCierre, totalBs, ingresosBs, precioUnitProm, totalBsProm },
      });
      saldosActualizados++;
    } else {
      await (prisma.saldoMensual.create as any)({
        data: { productoId, anio, mes, saldoInicial, ingresoQty, salidaQty, saldoFinal, precioUnit: precioCierre, totalBs, ingresosBs, precioUnitProm, totalBsProm },
      });
      saldosCreados++;
    }

    // Pre-populate next month saldoInicial
    const mesSig = mes === 12 ? 1 : mes + 1;
    const anioSig = mes === 12 ? anio + 1 : anio;
    const sigExistente = await prisma.saldoMensual.findUnique({
      where: { productoId_anio_mes: { productoId, anio: anioSig, mes: mesSig } },
    });
    if (sigExistente) {
      await (prisma.saldoMensual.update as any)({
        where: { productoId_anio_mes: { productoId, anio: anioSig, mes: mesSig } },
        data: { saldoInicial: saldoFinal },
      });
    } else {
      await (prisma.saldoMensual.create as any)({
        data: {
          productoId, anio: anioSig, mes: mesSig,
          saldoInicial: saldoFinal, ingresoQty: 0, salidaQty: 0, ingresosBs: 0,
          saldoFinal, precioUnit: precioCierre, totalBs,
          precioUnitProm, totalBsProm,
        },
      });
    }
  }

  // Recalcular cadena stockAntes/stockDespues para todos los movimientos retroactivos
  // del período, ordenados cronológicamente por createdAt (= fechaOperacion)
  let movimientosRecalculados = 0;
  const productosConRetroactivos = await prisma.movimiento.groupBy({
    by: ["productoId"],
    where: { esRetroactivo: true, periodoAnio: anio, periodoMes: mes },
  });

  for (const { productoId } of productosConRetroactivos) {
    const saldoDelMes = await prisma.saldoMensual.findUnique({
      where: { productoId_anio_mes: { productoId, anio, mes } },
      select: { saldoInicial: true, precioUnit: true },
    });

    const retroactivos = await prisma.movimiento.findMany({
      where: { productoId, esRetroactivo: true, periodoAnio: anio, periodoMes: mes },
      orderBy: { createdAt: "asc" },
    });

    let balance = saldoDelMes
      ? new Prisma.Decimal(saldoDelMes.saldoInicial)
      : new Prisma.Decimal(0);

    for (const mov of retroactivos) {
      const antes = balance;
      balance = mov.tipo === "ENTRADA" ? balance.add(mov.cantidad) : balance.sub(mov.cantidad);
      const precioU = new Prisma.Decimal(mov.precioUnit);
      await prisma.movimiento.update({
        where: { id: mov.id },
        data: {
          stockAntes: antes,
          stockDespues: balance,
          saldoBs: balance.mul(precioU),
          entradaBs: mov.tipo === "ENTRADA" ? precioU.mul(mov.cantidad) : 0,
          salidaBs: mov.tipo === "SALIDA" ? precioU.mul(mov.cantidad) : 0,
        },
      });
      movimientosRecalculados++;
    }
  }

  const cierre = await prisma.cierreMes.create({ data: { anio, mes, usuarioId: userId } });

  await prisma.log.create({
    data: {
      usuarioId: userId,
      accion: "CERRAR_MES",
      data: { anio, mes, saldosCreados, saldosActualizados, productosConMovimientos: productoIds.length, movimientosRecalculados },
    },
  });

  logger.info({ anio, mes, saldosCreados, saldosActualizados, movimientosRecalculados }, "Mes cerrado");

  return {
    cierre: { id: cierre.id, anio: cierre.anio, mes: cierre.mes, creadoAt: cierre.creadoAt },
    saldosCreados,
    saldosActualizados,
    productosConMovimientos: productoIds.length,
    movimientosRecalculados,
  };
}

export async function getCierres() {
  return prisma.cierreMes.findMany({ orderBy: [{ anio: "desc" }, { mes: "desc" }] });
}

// ─── Ajuste de precios sin IVA ────────────────────────────────────────────────
// Recalcula precios en SaldoMensual a partir de CompraItems reales (fuente de verdad)
// aplicando ×0.87 para quitar IVA, y propaga hacia meses siguientes.

function compraItemsDelMes(startOfMonth: Date, endOfMonth: Date) {
  return prisma.compraItem.findMany({
    where: {
      cantidadRecibida: { gt: 0 },
      compra: {
        estado: { not: "ANULADA" },
        OR: [
          { fechaOperacion: { gte: startOfMonth, lt: endOfMonth } },
          { fechaOperacion: null, recibidoAt: { gte: startOfMonth, lt: endOfMonth } },
          { fechaOperacion: null, recibidoAt: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
        ],
      },
    },
    select: { productoId: true, cantidadRecibida: true, precioUnit: true },
  });
}

function buildCompraMapFromItems(items: Array<{ productoId: number; cantidadRecibida: unknown; precioUnit: unknown }>) {
  const map = new Map<number, { qty: Prisma.Decimal; bs: Prisma.Decimal }>();
  for (const item of items) {
    const qty   = new Prisma.Decimal(item.cantidadRecibida as string);
    const precio = new Prisma.Decimal(item.precioUnit as string);
    const e     = map.get(item.productoId) ?? { qty: new Prisma.Decimal(0), bs: new Prisma.Decimal(0) };
    e.qty = e.qty.add(qty);
    e.bs  = e.bs.add(qty.mul(precio));
    map.set(item.productoId, e);
  }
  return map;
}

export async function ajustarPreciosSinIva(anio: number, mes: number) {
  const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
  const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

  const [saldos, comprasRaw] = await Promise.all([
    (prisma.saldoMensual.findMany as any)({
      where: { anio, mes },
      select: {
        id: true, productoId: true,
        precioUnit: true, precioUnitProm: true,
        saldoFinal: true,
      },
    }) as Promise<Array<{ id: string; productoId: number; precioUnit: unknown; precioUnitProm: unknown; saldoFinal: unknown }>>,
    compraItemsDelMes(startOfMonth, endOfMonth),
  ]);

  // Precio promedio ponderado con-IVA por producto, calculado desde CompraItems reales
  const compraMap = buildCompraMapFromItems(comprasRaw);

  type Resumen = { productoId: number; accion: string; precioAnterior: number; precioNuevo: number };
  const resumen: Resumen[] = [];

  for (const s of saldos) {
    const compra    = compraMap.get(s.productoId);
    const pUnit     = new Prisma.Decimal(s.precioUnit as string);
    const pProm     = new Prisma.Decimal((s.precioUnitProm as string) ?? '0');
    const saldoFinal = new Prisma.Decimal(s.saldoFinal as string);

    if (!compra || compra.qty.isZero()) {
      // Sin compras: si precioUnitProm está vacío pero precioUnit tiene valor, igualarlos
      if (pUnit.gt(0) && pProm.isZero()) {
        await (prisma.saldoMensual.update as any)({
          where: { id: s.id },
          data: {
            precioUnitProm: pUnit,
            totalBsProm:    saldoFinal.mul(pUnit).toDecimalPlaces(6),
          },
        });
      }
      resumen.push({ productoId: s.productoId, accion: 'sin_cambio', precioAnterior: Number(pUnit), precioNuevo: Number(pUnit) });
      continue;
    }

    const pAnterior = pUnit;
    // Precio promedio real de las compras del mes, luego ×0.87 para quitar IVA
    const promConIva      = compra.bs.div(compra.qty);
    const nuevoPrecio     = promConIva.mul('0.87').toDecimalPlaces(6);
    const nuevoIngresosBs = compra.bs.mul('0.87').toDecimalPlaces(6);

    await (prisma.saldoMensual.update as any)({
      where: { id: s.id },
      data: {
        precioUnit:     nuevoPrecio,
        precioUnitProm: nuevoPrecio,
        ingresosBs:     nuevoIngresosBs,
        totalBs:        saldoFinal.mul(nuevoPrecio).toDecimalPlaces(6),
        totalBsProm:    saldoFinal.mul(nuevoPrecio).toDecimalPlaces(6),
      },
    });

    resumen.push({ productoId: s.productoId, accion: 'ajustado', precioAnterior: Number(pAnterior), precioNuevo: Number(nuevoPrecio) });
  }

  // Cascade: propagar hacia meses siguientes recalculando desde CompraItems reales
  const ahora      = new Date();
  const anioActual = ahora.getUTCFullYear();
  const mesActual  = ahora.getUTCMonth() + 1;

  for (const item of resumen.filter(r => r.accion === 'ajustado')) {
    let precioVigente = new Prisma.Decimal(item.precioNuevo);
    let mesIter  = mes === 12 ? 1  : mes  + 1;
    let anioIter = mes === 12 ? anio + 1 : anio;

    while (anioIter < anioActual || (anioIter === anioActual && mesIter <= mesActual)) {
      const saldoSig = await (prisma.saldoMensual.findUnique as any)({
        where: { productoId_anio_mes: { productoId: item.productoId, anio: anioIter, mes: mesIter } },
        select: { id: true, saldoFinal: true },
      });

      if (!saldoSig) break;

      const startSig = new Date(Date.UTC(anioIter, mesIter - 1, 1));
      const endSig   = new Date(Date.UTC(anioIter, mesIter, 1));
      const comprasSig = await compraItemsDelMes(startSig, endSig);
      const compraMapSig = buildCompraMapFromItems(comprasSig);
      const compraSig = compraMapSig.get(item.productoId);

      const sf = new Prisma.Decimal(saldoSig.saldoFinal);

      if (compraSig && !compraSig.qty.isZero()) {
        // Mes con compras: recalcular precio desde CompraItems reales × 0.87
        const np   = compraSig.bs.div(compraSig.qty).mul('0.87').toDecimalPlaces(6);
        const nIBs = compraSig.bs.mul('0.87').toDecimalPlaces(6);
        await (prisma.saldoMensual.update as any)({
          where: { id: saldoSig.id },
          data: { precioUnit: np, precioUnitProm: np, ingresosBs: nIBs, totalBs: sf.mul(np).toDecimalPlaces(6), totalBsProm: sf.mul(np).toDecimalPlaces(6) },
        });
        precioVigente = np;
      } else {
        // Mes sin compras: heredar precio vigente del mes anterior
        await (prisma.saldoMensual.update as any)({
          where: { id: saldoSig.id },
          data: { precioUnit: precioVigente, precioUnitProm: precioVigente, totalBs: sf.mul(precioVigente).toDecimalPlaces(6), totalBsProm: sf.mul(precioVigente).toDecimalPlaces(6) },
        });
      }

      mesIter  = mesIter === 12 ? 1 : mesIter + 1;
      anioIter = mesIter === 1  ? anioIter + 1 : anioIter;
    }
  }

  return {
    periodo:   `${mes}/${anio}`,
    ajustados: resumen.filter(r => r.accion === 'ajustado').length,
    sinCambio: resumen.filter(r => r.accion === 'sin_cambio').length,
    detalle:   resumen,
  };
}

// ─── Diagnóstico de precios ───────────────────────────────────────────────────
// Devuelve productos con saldoFinal > 0 y precioUnit = 0 en el período dado.

export async function diagnosticarPrecios(anio: number, mes: number) {
  const saldos = await (prisma.saldoMensual.findMany as any)({
    where: { anio, mes },
    select: {
      productoId: true,
      saldoFinal: true,
      precioUnit: true,
      precioUnitProm: true,
      producto: { select: { codigo: true, nombre: true, unidad: true } },
    },
    orderBy: { producto: { codigo: 'asc' } },
  }) as Array<{
    productoId: number;
    saldoFinal: unknown;
    precioUnit: unknown;
    precioUnitProm: unknown;
    producto: { codigo: string; nombre: string; unidad: string };
  }>;

  const sinPrecio = saldos.filter(s => Number(s.saldoFinal) > 0 && Number(s.precioUnit) === 0);
  const sinProm   = saldos.filter(s => Number(s.saldoFinal) > 0 && Number(s.precioUnitProm) === 0 && Number(s.precioUnit) > 0);

  return {
    periodo: `${mes}/${anio}`,
    totalProductos: saldos.length,
    sinPrecioCount: sinPrecio.length,
    sinPromCount:   sinProm.length,
    sinPrecio: sinPrecio.map(s => ({
      productoId:    s.productoId,
      codigo:        s.producto.codigo,
      nombre:        s.producto.nombre,
      unidad:        s.producto.unidad,
      saldoFinal:    Number(s.saldoFinal),
      precioUnit:    Number(s.precioUnit),
      precioUnitProm: Number(s.precioUnitProm),
    })),
    sinProm: sinProm.map(s => ({
      productoId:    s.productoId,
      codigo:        s.producto.codigo,
      nombre:        s.producto.nombre,
      unidad:        s.producto.unidad,
      saldoFinal:    Number(s.saldoFinal),
      precioUnit:    Number(s.precioUnit),
      precioUnitProm: Number(s.precioUnitProm),
    })),
  };
}

// ─── Diagnóstico de saldos / movimientos ─────────────────────────────────────
// Compara SaldoMensual (salidaQty, ingresoQty) contra movimientos reales
// y verifica la ecuación: saldoInicial + ingresoQty - salidaQty = saldoFinal

export async function diagnosticarSaldos(anio: number, mes: number) {
  const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
  const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

  const movFilter = {
    OR: [
      { periodoAnio: anio, periodoMes: mes },
      { periodoAnio: null as null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
    ],
  };

  const [saldos, salidasMovsRaw, entradasMovs, anulacionValeMovs] = await Promise.all([
    (prisma.saldoMensual.findMany as any)({
      where: { anio, mes },
      select: {
        productoId: true,
        saldoInicial: true,
        ingresoQty: true,
        salidaQty: true,
        saldoFinal: true,
        producto: { select: { codigo: true, nombre: true, unidad: true } },
      },
      orderBy: { producto: { codigo: "asc" } },
    }) as Array<{
      productoId: number;
      saldoInicial: unknown;
      ingresoQty: unknown;
      salidaQty: unknown;
      saldoFinal: unknown;
      producto: { codigo: string; nombre: string; unidad: string };
    }>,
    prisma.movimiento.findMany({
      where: { tipo: "SALIDA", referencia: { not: "ANULACION_COMPRA" }, ...movFilter },
      select: { productoId: true, cantidad: true, referencia: true, referenciaId: true },
    }),
    prisma.movimiento.findMany({
      where: { tipo: "ENTRADA", referencia: { not: "SALDO_INICIAL" }, ...movFilter },
      select: { productoId: true, cantidad: true },
    }),
    prisma.movimiento.findMany({
      where: { referencia: "ANULACION_VALE", ...movFilter },
      select: { referenciaId: true },
    }),
  ]);

  const valesAnulados = new Set(
    anulacionValeMovs.map(m => m.referenciaId).filter((id): id is string => id !== null),
  );
  const salidasMovs = salidasMovsRaw.filter(
    m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnulados.has(m.referenciaId)),
  );

  const salidaMovMap = new Map<number, number>();
  for (const mov of salidasMovs) {
    salidaMovMap.set(mov.productoId, (salidaMovMap.get(mov.productoId) ?? 0) + Number(mov.cantidad));
  }

  const entradaMovMap = new Map<number, number>();
  for (const mov of entradasMovs) {
    entradaMovMap.set(mov.productoId, (entradaMovMap.get(mov.productoId) ?? 0) + Number(mov.cantidad));
  }

  const discrepancias: Array<{
    productoId: number;
    codigo: string;
    nombre: string;
    unidad: string;
    saldoInicial: number;
    ingresoQty: { saldoMensual: number; movimientos: number; diferencia: number; ok: boolean };
    salidaQty:  { saldoMensual: number; movimientos: number; diferencia: number; ok: boolean };
    saldoFinal: { saldoMensual: number; calculado: number; diferencia: number; ok: boolean };
    problemas: string[];
  }> = [];

  let productosOk = 0;

  for (const s of saldos) {
    const saldoInicial    = Number(s.saldoInicial);
    const ingresoQtySaldo = Number(s.ingresoQty);
    const salidaQtySaldo  = Number(s.salidaQty);
    const saldoFinalSaldo = Number(s.saldoFinal);

    const salidaQtyMovs   = salidaMovMap.get(s.productoId) ?? 0;
    const ingresoQtyMovs  = entradaMovMap.get(s.productoId) ?? 0;

    const saldoFinalCalc  = saldoInicial + ingresoQtySaldo - salidaQtySaldo;
    const balanceOk       = Math.abs(saldoFinalCalc - saldoFinalSaldo) < 0.001;
    const salidaOk        = Math.abs(salidaQtySaldo - salidaQtyMovs) < 0.001;
    const ingresoOk       = Math.abs(ingresoQtySaldo - ingresoQtyMovs) < 0.001;

    if (!balanceOk || !salidaOk || !ingresoOk) {
      const problemas: string[] = [];
      if (!salidaOk)  problemas.push(`salidaQty: SaldoMensual=${salidaQtySaldo} Movimientos=${salidaQtyMovs}`);
      if (!ingresoOk) problemas.push(`ingresoQty: SaldoMensual=${ingresoQtySaldo} Movimientos=${ingresoQtyMovs}`);
      if (!balanceOk) problemas.push(`balance: ${saldoInicial}+${ingresoQtySaldo}-${salidaQtySaldo}=${saldoFinalCalc} ≠ saldoFinal=${saldoFinalSaldo}`);

      discrepancias.push({
        productoId: s.productoId,
        codigo: s.producto.codigo,
        nombre: s.producto.nombre,
        unidad: s.producto.unidad,
        saldoInicial,
        ingresoQty: { saldoMensual: ingresoQtySaldo, movimientos: ingresoQtyMovs, diferencia: ingresoQtySaldo - ingresoQtyMovs, ok: ingresoOk },
        salidaQty:  { saldoMensual: salidaQtySaldo,  movimientos: salidaQtyMovs,  diferencia: salidaQtySaldo - salidaQtyMovs,   ok: salidaOk  },
        saldoFinal: { saldoMensual: saldoFinalSaldo,  calculado: saldoFinalCalc,   diferencia: saldoFinalSaldo - saldoFinalCalc,  ok: balanceOk },
        problemas,
      });
    } else {
      productosOk++;
    }
  }

  return {
    periodo: `${mes}/${anio}`,
    totalProductos: saldos.length,
    productosOk,
    discrepanciasCount: discrepancias.length,
    discrepancias,
  };
}

// ─── Recalcular stock histórico ───────────────────────────────────────────────

export interface RecalcularStockInput {
  productoId: number;
  stockInicial: number;
  eliminarValeIds?: string[];
}

export interface RecalcularStockResult {
  productoId: number;
  stockInicial: number;
  stockFinal: number;
  movimientosRecalculados: number;
  valesEliminados: number;
  correccionesLimpiadas: number;
}

export async function recalcularStock(
  input: RecalcularStockInput,
  userId: number,
): Promise<RecalcularStockResult> {
  const { productoId, stockInicial, eliminarValeIds = [] } = input;

  const producto = await prisma.producto.findUnique({ where: { id: productoId }, select: { id: true, nombre: true } });
  if (!producto) throw new HttpError("Producto no encontrado", 404);

  // 1. Eliminar vales de prueba indicados y sus movimientos
  let valesEliminados = 0;
  for (const valeId of eliminarValeIds) {
    const vale = await prisma.vale.findUnique({ where: { id: valeId } });
    if (!vale) continue;
    await prisma.movimiento.deleteMany({ where: { referenciaId: valeId } });
    await prisma.valeItem.deleteMany({ where: { valeId } });
    await prisma.vale.delete({ where: { id: valeId } });
    valesEliminados++;
  }

  // 2. Limpiar automáticamente correcciones de stock huérfanas:
  //    ENTRADA sin referencia a una compra real (SALDO_INICIAL, ajustes manuales, etc.)
  //    Estas son reemplazadas por el stockInicial que se pasa como parámetro.
  const { count: correccionesLimpiadas } = await prisma.movimiento.deleteMany({
    where: {
      productoId,
      tipo: "ENTRADA",
      NOT: { referencia: "COMPRA" },
    },
  });

  // 3. Obtener todos los movimientos reales restantes ordenados por fecha
  const movimientos = await prisma.movimiento.findMany({
    where: { productoId },
    orderBy: { createdAt: "asc" },
  });

  // 4. Recalcular stockAntes/stockDespues en cascada desde el stockInicial correcto
  let stockActual = new Prisma.Decimal(stockInicial);
  for (const mov of movimientos) {
    const antes = stockActual;
    if (mov.tipo === "ENTRADA") {
      stockActual = stockActual.add(mov.cantidad);
    } else {
      stockActual = stockActual.sub(mov.cantidad);
    }
    await prisma.movimiento.update({
      where: { id: mov.id },
      data: { stockAntes: antes, stockDespues: stockActual },
    });
  }

  // 5. Actualizar el stock actual del producto
  await prisma.stock.update({
    where: { productoId },
    data: { cantidad: stockActual },
  });

  await prisma.log.create({
    data: {
      usuarioId: userId,
      accion: "RECALCULAR_STOCK",
      data: { productoId, stockInicial, stockFinal: stockActual, valesEliminados, correccionesLimpiadas },
    },
  });

  logger.info({ productoId, stockInicial, stockFinal: stockActual.toNumber(), valesEliminados, correccionesLimpiadas }, "Stock recalculado");

  return {
    productoId,
    stockInicial,
    stockFinal: stockActual.toNumber(),
    movimientosRecalculados: movimientos.length,
    valesEliminados,
    correccionesLimpiadas,
  };
}

// ─── Preview de un período: saldo acumulado sin cerrar el mes ─────────────────
// Combina saldoInicial de SaldoMensual con los movimientos retroactivos ya cargados
// para ese período, sin tocar nada en la base de datos.

export async function getPreviewPeriodo(anio: number, mes: number) {
  const esCerrado = !!(await prisma.cierreMes.findUnique({ where: { anio_mes: { anio, mes } } }));

  const startOfMonth = new Date(Date.UTC(anio, mes - 1, 1));
  const endOfMonth   = new Date(Date.UTC(anio, mes, 1));

  const movFilter = {
    OR: [
      { periodoAnio: anio, periodoMes: mes },
      { periodoAnio: null as null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
    ],
  };

  const [saldos, entradasMovs, salidasMovsRaw, anulacionValeMovs] = await Promise.all([
    prisma.saldoMensual.findMany({
      where: { anio, mes },
      include: { producto: { include: { categoria: { include: { parent: true } } } } },
      orderBy: { producto: { codigo: "asc" } },
    }),
    // Excluir reversas de vales anulados — no son ingresos reales
    prisma.movimiento.findMany({
      where: { tipo: "ENTRADA", referencia: { not: "ANULACION_VALE" }, ...movFilter },
      select: { productoId: true, cantidad: true, entradaBs: true },
    }),
    prisma.movimiento.findMany({
      where: { tipo: "SALIDA", ...movFilter },
      select: { productoId: true, cantidad: true, referencia: true, referenciaId: true },
    }),
    prisma.movimiento.findMany({
      where: { referencia: "ANULACION_VALE", ...movFilter },
      select: { referenciaId: true },
    }),
  ]);

  // IDs de vales cuya entrega fue revertida en este período
  const valesAnuladosIdsPreview = new Set(
    anulacionValeMovs.map(m => m.referenciaId).filter((id): id is string => id !== null),
  );
  // Excluir SALIDAs de vales que fueron anulados (la reversa ANULACION_VALE ya fue excluida arriba)
  const salidasMovs = salidasMovsRaw.filter(
    m => !(m.referencia === "VALE" && m.referenciaId !== null && valesAnuladosIdsPreview.has(m.referenciaId)),
  );

  // Mapa productoId → entradas (cantidad y Bs para precio promedio)
  const entradaMap = new Map<number, { totalBsEntrada: number; qty: number }>();
  for (const mov of entradasMovs) {
    const pid = mov.productoId;
    if (!entradaMap.has(pid)) entradaMap.set(pid, { totalBsEntrada: 0, qty: 0 });
    const e = entradaMap.get(pid)!;
    e.totalBsEntrada += Number(mov.entradaBs);
    e.qty            += Number(mov.cantidad);
  }

  // Mapa productoId → salidas (cantidad real desde Movimiento, sin vales anulados)
  const salidaMap = new Map<number, number>();
  for (const mov of salidasMovs) {
    salidaMap.set(mov.productoId, (salidaMap.get(mov.productoId) ?? 0) + Number(mov.cantidad));
  }

  const items = saldos.map((r) => {
    const entrada    = entradaMap.get(r.productoId);
    const ingresoQty = entrada ? entrada.qty : Number(r.ingresoQty);
    const salidaQty  = salidaMap.has(r.productoId) ? salidaMap.get(r.productoId)! : Number(r.salidaQty);
    const saldoInicial = Number(r.saldoInicial);
    const saldoFinal   = saldoInicial + ingresoQty - salidaQty;

    const precioUnit = entrada && entrada.qty > 0
      ? entrada.totalBsEntrada / entrada.qty
      : Number(r.precioUnit);
    const precioUnitProm = entrada && entrada.qty > 0
      ? entrada.totalBsEntrada / entrada.qty
      : Number((r as any).precioUnitProm ?? r.precioUnit);
    return {
      productoId: r.productoId,
      productoCodigo: r.producto.codigo,
      productoNombre: r.producto.nombre,
      unidad: r.producto.unidad,
      grupo: r.producto.categoria.parent?.nombre ?? r.producto.categoria.nombre,
      subGrupo: r.producto.categoria.parent ? r.producto.categoria.nombre : null,
      saldoInicial,
      ingresoQty,
      salidaQty,
      saldoFinal,
      precioUnit,
      totalBs:        saldoFinal * precioUnit,
      precioUnitProm,
      totalBsProm:    saldoFinal * precioUnitProm,
    };
  });

  const resumen = items.reduce(
    (acc, i) => ({
      totalProductos: acc.totalProductos + 1,
      productosConMovimiento: acc.productosConMovimiento + (i.ingresoQty > 0 || i.salidaQty > 0 ? 1 : 0),
      totalUnidades: acc.totalUnidades + i.saldoFinal,
      totalBs: acc.totalBs + i.totalBs,
    }),
    { totalProductos: 0, productosConMovimiento: 0, totalUnidades: 0, totalBs: 0 },
  );

  return { anio, mes, esCerrado, resumen, items };
}

// ─── Recalcular precios promedio en registros existentes ─────────────────────
// Recorre todos los SaldoMensual con ingresoQty > 0 y recalcula ingresosBs,
// precioUnit (último de compra) y precioUnitProm desde los Movimiento reales.
// Útil para rellenar los campos nuevos en registros históricos ya existentes.

export async function recalcularPreciosProm() {
  const saldos = await prisma.saldoMensual.findMany({
    where: { ingresoQty: { gt: 0 } },
    select: { id: true, productoId: true, anio: true, mes: true, ingresoQty: true, saldoFinal: true },
  });

  let actualizados = 0;

  for (const saldo of saldos) {
    const startOfMonth = new Date(Date.UTC(saldo.anio, saldo.mes - 1, 1));
    const endOfMonth   = new Date(Date.UTC(saldo.anio, saldo.mes, 1));

    const entradas = await prisma.movimiento.findMany({
      where: {
        productoId: saldo.productoId,
        tipo: "ENTRADA",
        OR: [
          { periodoAnio: saldo.anio, periodoMes: saldo.mes },
          { periodoAnio: null, createdAt: { gte: startOfMonth, lt: endOfMonth } },
        ],
      },
      select: { cantidad: true, precioUnit: true, entradaBs: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    if (entradas.length === 0) continue;

    // Acumular ingresosBs y determinar último precio
    let ingresosBs    = new Prisma.Decimal(0);
    let lastPrecioUnit = new Prisma.Decimal(0);
    let totalQty      = new Prisma.Decimal(0);

    for (const e of entradas) {
      const bs  = new Prisma.Decimal(e.entradaBs);
      const qty = new Prisma.Decimal(e.cantidad);
      ingresosBs    = ingresosBs.add(bs);
      totalQty      = totalQty.add(qty);
      lastPrecioUnit = new Prisma.Decimal(e.precioUnit);
    }

    const saldoFinal     = new Prisma.Decimal(saldo.saldoFinal);
    const precioUnitProm = totalQty.gt(0) ? ingresosBs.div(totalQty) : lastPrecioUnit;

    await (prisma.saldoMensual.update as any)({
      where: { id: saldo.id },
      data: {
        precioUnit:     lastPrecioUnit,
        totalBs:        saldoFinal.mul(lastPrecioUnit),
        ingresosBs,
        precioUnitProm,
        totalBsProm:    saldoFinal.mul(precioUnitProm),
      },
    });

    actualizados++;
  }

  logger.info({ actualizados }, "Precios promedio recalculados");
  return { actualizados };
}

// ─── Ajuste masivo de SaldoMensual por mes (sin movimientos) ──────────────────
// Permite corregir precio, stock y demás campos en productos que NO tienen
// movimientos ese mes. Si el SaldoMensual no existe lo crea.
// Solo ADMIN. Nunca toca meses con movimientos para el producto.

type AjusteProductoItem = {
  productoId?:    number;
  productoCodigo?: string;
  precioUnit?:    number;
  saldoInicial?:  number;
  saldoFinal?:    number;
  ingresoQty?:    number;
  salidaQty?:     number;
  totalBs?:       number;
  totalBsInicial?: number;
};

type AjusteProductoResultado =
  | { productoId: number; productoCodigo: string; ok: true; accion: "creado" | "actualizado"; saldoMensual: Record<string, unknown> }
  | { productoId: number | null; productoCodigo: string | null; ok: false; error: string };

export async function ajusteProductosMes(
  anio: number,
  mes: number,
  productos: AjusteProductoItem[],
): Promise<AjusteProductoResultado[]> {
  const mesInicio = new Date(anio, mes - 1, 1);
  const mesFin    = new Date(anio, mes,     1);

  const resultados: AjusteProductoResultado[] = [];

  for (const item of productos) {
    let productoId: number;
    let productoCodigo: string;

    try {
      productoId = await resolveProductoId(item.productoId, item.productoCodigo);
      const prod = await prisma.producto.findUnique({ where: { id: productoId }, select: { codigo: true } });
      productoCodigo = prod?.codigo ?? String(productoId);
    } catch {
      resultados.push({
        productoId:     item.productoId ?? null,
        productoCodigo: item.productoCodigo ?? null,
        ok: false,
        error: "Producto no encontrado",
      });
      continue;
    }

    // Verificar que no tenga movimientos en el mes
    const movCount = await prisma.movimiento.count({
      where: {
        productoId,
        OR: [
          { createdAt: { gte: mesInicio, lt: mesFin }, esRetroactivo: false },
          { esRetroactivo: true, periodoAnio: anio, periodoMes: mes },
        ],
      },
    });

    if (movCount > 0) {
      resultados.push({
        productoId,
        productoCodigo,
        ok: false,
        error: `Tiene ${movCount} movimiento(s) en ${mes}/${anio} — no se puede ajustar`,
      });
      continue;
    }

    // Leer el registro actual (si existe)
    const existing = await (prisma.saldoMensual.findUnique as any)({
      where: { productoId_anio_mes: { productoId, anio, mes } },
      select: {
        saldoInicial: true, ingresoQty: true, salidaQty: true,
        saldoFinal:   true, precioUnit: true, totalBs: true,
      },
    }) as { saldoInicial: unknown; ingresoQty: unknown; salidaQty: unknown; saldoFinal: unknown; precioUnit: unknown; totalBs: unknown } | null;

    // Valores base (existing o cero)
    const baseSaldoInicial = item.saldoInicial  !== undefined ? item.saldoInicial  : Number(existing?.saldoInicial  ?? 0);
    const baseIngresoQty   = item.ingresoQty    !== undefined ? item.ingresoQty    : Number(existing?.ingresoQty    ?? 0);
    const baseSalidaQty    = item.salidaQty     !== undefined ? item.salidaQty     : Number(existing?.salidaQty     ?? 0);
    const baseSaldoFinal   = item.saldoFinal    !== undefined ? item.saldoFinal    : baseSaldoInicial + baseIngresoQty - baseSalidaQty;
    const basePrecioUnit   = item.precioUnit    !== undefined ? item.precioUnit    : Number(existing?.precioUnit     ?? 0);
    const baseTotalBs      = item.totalBs       !== undefined ? item.totalBs       : baseSaldoFinal * basePrecioUnit;

    const data: Record<string, unknown> = {
      saldoInicial:  baseSaldoInicial,
      ingresoQty:    baseIngresoQty,
      salidaQty:     baseSalidaQty,
      saldoFinal:    baseSaldoFinal,
      precioUnit:    basePrecioUnit,
      totalBs:       baseTotalBs,
    };
    if (item.totalBsInicial !== undefined) data.totalBsInicial = item.totalBsInicial;

    let record: Record<string, unknown>;
    let accion: "creado" | "actualizado";

    if (existing) {
      record = await (prisma.saldoMensual.update as any)({
        where: { productoId_anio_mes: { productoId, anio, mes } },
        data,
      });
      accion = "actualizado";
    } else {
      record = await (prisma.saldoMensual.create as any)({
        data: { productoId, anio, mes, ingresosBs: 0, ...data },
      });
      accion = "creado";
    }

    resultados.push({ productoId, productoCodigo, ok: true, accion, saldoMensual: record });
  }

  logger.info({ anio, mes, total: productos.length, ok: resultados.filter(r => r.ok).length }, "Ajuste masivo SaldoMensual");
  return resultados;
}
