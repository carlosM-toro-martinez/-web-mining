import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { detectarPeriodo } from "../../utils/periodoRetroactivo.js";
import type { CreateCompraDTO, RecibirCompraDTO, CompraQueryDTO } from "./compras.types.js";

export const comprasService = {
  async createCompra(data: CreateCompraDTO, userId: number) {
    // Validar que proveedor existe
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: data.proveedorId },
    });

    if (!proveedor) {
      throw new HttpError("Proveedor no encontrado", 404);
    }

    // Resolver productoId desde productoCodigo cuando sea necesario y validar existencia
    const itemsResueltos: { productoId: number; productoCodigo: string; cantidadPedida: number; precioUnit: number }[] = [];
    const noEncontrados: string[] = [];

    for (const item of data.items) {
      if (item.productoId) {
        const p = await prisma.producto.findUnique({
          where: { id: item.productoId },
          select: { id: true, codigo: true },
        });
        if (!p) {
          noEncontrados.push(`id:${item.productoId}`);
        } else {
          itemsResueltos.push({ productoId: p.id, productoCodigo: p.codigo, cantidadPedida: item.cantidadPedida, precioUnit: item.precioUnit });
        }
      } else {
        const p = await prisma.producto.findUnique({
          where: { codigo: item.productoCodigo! },
          select: { id: true, codigo: true },
        });
        if (!p) {
          noEncontrados.push(`código:"${item.productoCodigo}"`);
        } else {
          itemsResueltos.push({ productoId: p.id, productoCodigo: p.codigo, cantidadPedida: item.cantidadPedida, precioUnit: item.precioUnit });
        }
      }
    }

    if (noEncontrados.length > 0) {
      throw new HttpError(
        `Productos no encontrados: ${noEncontrados.join(", ")}`,
        404,
      );
    }

    const compra = await prisma.compra.create({
      data: {
        proveedorId: data.proveedorId,
        usuarioRegistroId: userId,
        estado: "PENDIENTE",
        observacion: data.observacion ?? null,
        fechaOperacion: data.fechaOperacion ?? null,
        numeroFactura: data.numeroFactura ?? null,
        items: {
          create: itemsResueltos.map((item) => ({
            productoId: item.productoId,
            cantidadPedida: item.cantidadPedida,
            precioUnit: item.precioUnit,
          })),
        },
      },
      include: {
        proveedor: true,
        usuarioRegistro: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: true,
          },
        },
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "CREATE_COMPRA",
        data: {
          compraId: compra.id,
          proveedorId: data.proveedorId,
          items: data.items,
        },
      },
    });

    logger.info({ userId, compraId: compra.id, action: "CREATE_COMPRA" }, "Compra creada");

    return compra;
  },

  async getCompras(query: CompraQueryDTO, userId: number) {
    const page  = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (query.estado)      where.estado      = query.estado;
    if (query.proveedorId) where.proveedorId = query.proveedorId;

    // Filtro por período (mes exacto tiene precedencia sobre rango libre)
    if (query.anio && query.mes) {
      const start = new Date(Date.UTC(query.anio, query.mes - 1, 1));
      const end   = new Date(Date.UTC(query.anio, query.mes, 1));
      where.OR = [
        { fechaOperacion: { gte: start, lt: end } },
        { fechaOperacion: null, createdAt: { gte: start, lt: end } },
      ];
    } else if (query.fechaInicio || query.fechaFin) {
      const range: any = {};
      if (query.fechaInicio) range.gte = new Date(Date.UTC(query.fechaInicio.getUTCFullYear(), query.fechaInicio.getUTCMonth(), query.fechaInicio.getUTCDate()));
      if (query.fechaFin)    range.lte = new Date(Date.UTC(query.fechaFin.getUTCFullYear(),    query.fechaFin.getUTCMonth(),    query.fechaFin.getUTCDate(),    23, 59, 59, 999));
      where.OR = [
        { fechaOperacion: range },
        { fechaOperacion: null, createdAt: range },
      ];
    }

    const include = {
      proveedor: true,
      usuarioRegistro: { select: { id: true, nombre: true, email: true } },
      usuarioRecibe:   { select: { id: true, nombre: true, email: true } },
      anulacion: { include: { usuario: { select: { id: true, nombre: true, email: true } } } },
      items: {
        include: { producto: { include: { stock: true } } },
      },
    };

    if (query.sinPaginar) {
      const compras = await prisma.compra.findMany({ where, include, orderBy: { createdAt: "desc" } });
      return { compras, meta: { total: compras.length } };
    }

    const [compras, total] = await Promise.all([
      prisma.compra.findMany({ where, skip, take: limit, include, orderBy: { createdAt: "desc" } }),
      prisma.compra.count({ where }),
    ]);

    return { compras, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getCompraById(id: string) {
    return prisma.compra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        usuarioRegistro: { select: { id: true, nombre: true, email: true } },
        usuarioRecibe: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: {
              include: {
                stock: true,
                cuenta: {
                  include: {
                    centroCosto: true,
                    funcionGasto: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async recibirCompra(id: string, data: RecibirCompraDTO, userId: number) {
    const compra = await prisma.compra.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: {
              include: {
                stock: true,
                cuenta: true,
              },
            },
          },
        },
      },
    });

    if (!compra) {
      throw new HttpError("Compra no encontrada", 404);
    }

    if (compra.estado === "COMPLETADO") {
      const compraActual = await prisma.compra.findUnique({
        where: { id },
        include: {
          proveedor: true,
          usuarioRegistro: { select: { id: true, nombre: true, email: true } },
          usuarioRecibe: { select: { id: true, nombre: true, email: true } },
          items: { include: { producto: true } },
        },
      });
      return { compra: compraActual!, movimientos: [] };
    }

    // Validar que todas las cantidades sean válidas
    const recibirIds = Object.keys(data.cantidadesRecibidas);
    for (const itemId of recibirIds) {
      const item = compra.items.find((i) => i.id === itemId);
      if (!item) {
        throw new HttpError(`Item ${itemId} no encontrado en la compra`, 404);
      }

      const cantidad = data.cantidadesRecibidas[itemId];
      if (cantidad === undefined || cantidad < 0) {
        throw new HttpError(`Cantidad inválida para item ${itemId}`, 400);
      }
      if (cantidad > Number(item.cantidadPedida)) {
        throw new HttpError(
          `La cantidad recibida no puede exceder la pedida para ${item.producto.nombre}`,
          409,
        );
      }
    }

    // Detectar si la operación es retroactiva
    const periodoRecibo = await detectarPeriodo(compra.fechaOperacion);
    const esRetroactivo = periodoRecibo.esRetroactivo;
    const periodoAnio = periodoRecibo.esRetroactivo ? periodoRecibo.periodoAnio : undefined;
    const periodoMes = periodoRecibo.esRetroactivo ? periodoRecibo.periodoMes : undefined;

    // Crear movimientos de entrada para cada item y actualizar stock
    const movimientos = [];
    for (const item of compra.items) {
      const cantidadRecibidaAhora = data.cantidadesRecibidas[item.id] ?? 0;
      if (cantidadRecibidaAhora > 0) {
        const precioUnit = item.precioUnit;

        if (esRetroactivo) {
          // Movimiento retroactivo: actualiza SaldoMensual, NO toca Stock
          const saldo = await prisma.saldoMensual.findUnique({
            where: { productoId_anio_mes: { productoId: item.productoId, anio: periodoAnio!, mes: periodoMes! } },
          });

          const stockAntesRetro = saldo ? new Prisma.Decimal(saldo.saldoFinal) : new Prisma.Decimal(0);
          const stockDespuesRetro = stockAntesRetro.add(cantidadRecibidaAhora);

          const movimiento = await prisma.movimiento.create({
            data: {
              operationId: randomUUID(),
              productoId: item.productoId,
              tipo: "ENTRADA",
              cantidad: cantidadRecibidaAhora,
              precioUnit,
              entradaBs: new Prisma.Decimal(precioUnit).mul(cantidadRecibidaAhora),
              salidaBs: 0,
              saldoBs: stockDespuesRetro.mul(precioUnit),
              stockAntes: stockAntesRetro,
              stockDespues: stockDespuesRetro,
              usuarioId: userId,
              usuarioEntregaId: userId,
              cuentaId: item.producto.cuentaId,
              referencia: "COMPRA",
              referenciaId: id,
              esRetroactivo: true,
              periodoAnio: periodoAnio ?? null,
              periodoMes: periodoMes ?? null,
              createdAt: compra.fechaOperacion!,
            },
          });

          const nuevoIngreso   = new Prisma.Decimal(saldo?.ingresoQty ?? 0).add(cantidadRecibidaAhora);
          const nuevoFinal     = new Prisma.Decimal(saldo?.saldoFinal ?? 0).add(cantidadRecibidaAhora);
          const precioUnitDec  = new Prisma.Decimal(precioUnit);
          // Acumulado Bs de entradas → permite calcular precio promedio ponderado
          const newIngresosBs    = new Prisma.Decimal((saldo as any)?.ingresosBs ?? 0).add(precioUnitDec.mul(cantidadRecibidaAhora));
          const newPrecioUnitProm = nuevoIngreso.gt(0) ? newIngresosBs.div(nuevoIngreso) : precioUnitDec;
          await (prisma.saldoMensual.upsert as any)({
            where: { productoId_anio_mes: { productoId: item.productoId, anio: periodoAnio!, mes: periodoMes! } },
            update: {
              ingresoQty:     nuevoIngreso,
              saldoFinal:     nuevoFinal,
              precioUnit:     precioUnitDec,
              totalBs:        nuevoFinal.mul(precioUnitDec),
              ingresosBs:     newIngresosBs,
              precioUnitProm: newPrecioUnitProm,
              totalBsProm:    nuevoFinal.mul(newPrecioUnitProm),
            },
            create: {
              productoId: item.productoId, anio: periodoAnio!, mes: periodoMes!,
              saldoInicial: 0, salidaQty: 0,
              ingresoQty:     cantidadRecibidaAhora,
              saldoFinal:     nuevoFinal,
              precioUnit:     precioUnitDec,
              totalBs:        nuevoFinal.mul(precioUnitDec),
              ingresosBs:     precioUnitDec.mul(cantidadRecibidaAhora),
              precioUnitProm: precioUnitDec,
              totalBsProm:    nuevoFinal.mul(precioUnitDec),
            },
          });

          await prisma.compraItem.update({
            where: { id: item.id },
            data: { cantidadRecibida: new Prisma.Decimal(item.cantidadRecibida).add(cantidadRecibidaAhora) },
          });

          movimientos.push(movimiento);
        } else {
          const stockAntes = item.producto.stock!.cantidad;
          const stockDespues = new Prisma.Decimal(stockAntes).add(cantidadRecibidaAhora);

          const movimiento = await prisma.movimiento.create({
            data: {
              operationId: randomUUID(),
              productoId: item.productoId,
              tipo: "ENTRADA",
              cantidad: cantidadRecibidaAhora,
              precioUnit,
              entradaBs: new Prisma.Decimal(precioUnit).mul(cantidadRecibidaAhora),
              salidaBs: 0,
              saldoBs: stockDespues.mul(precioUnit),
              stockAntes,
              stockDespues,
              usuarioId: userId,
              usuarioEntregaId: userId,
              cuentaId: item.producto.cuentaId,
              referencia: "COMPRA",
              referenciaId: id,
            },
          });

          await prisma.compraItem.update({
            where: { id: item.id },
            data: { cantidadRecibida: new Prisma.Decimal(item.cantidadRecibida).add(cantidadRecibidaAhora) },
          });

          await prisma.stock.update({
            where: { productoId: item.productoId },
            data: { cantidad: stockDespues, precioUnit },
          });

          movimientos.push(movimiento);
        }
      }
    }

    // Verificar si la compra está completa
    const compraActualizada = await prisma.compra.findUnique({
      where: { id },
      include: { items: true },
    });

    const allFullyReceived = compraActualizada!.items.every((item) => {
      return new Prisma.Decimal(item.cantidadRecibida).equals(
        new Prisma.Decimal(item.cantidadPedida),
      );
    });

    const anyReceived = compraActualizada!.items.some((item) => {
      return new Prisma.Decimal(item.cantidadRecibida).gt(0);
    });

    const newState = allFullyReceived ? "COMPLETADO" : anyReceived ? "PARCIAL" : "PENDIENTE";

    const compraFinal = await prisma.compra.update({
      where: { id },
      data: {
        estado: newState,
        usuarioRecibidoId: userId,
        recibidoAt: newState === "COMPLETADO" ? new Date() : compra.recibidoAt,
      },
      include: {
        proveedor: true,
        usuarioRegistro: { select: { id: true, nombre: true, email: true } },
        usuarioRecibe: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: true,
          },
        },
      },
    });

    await prisma.log.create({
      data: {
        usuarioId: userId,
        accion: "RECIBIR_COMPRA",
        data: {
          compraId: id,
          cantidadesRecibidas: data.cantidadesRecibidas,
          nuevoEstado: newState,
        },
      },
    });

    logger.info({ userId, compraId: id, action: "RECIBIR_COMPRA" }, "Compra recibida");

    return {
      compra: compraFinal,
      movimientos,
    };
  },

  async anularCompra(id: string, motivo: string, userId: number) {
    const compra = await prisma.compra.findUnique({
      where: { id },
      include: {
        items: { include: { producto: { include: { stock: true } } } },
        anulacion: true,
      },
    });

    if (!compra) throw new HttpError("Compra no encontrada", 404);
    if (compra.estado === "ANULADA") throw new HttpError("La compra ya está anulada", 409);
    if (compra.anulacion) throw new HttpError("La compra ya tiene una anulación registrada", 409);

    const periodoCompra = await detectarPeriodo(compra.fechaOperacion);
    const esRetroactivo = periodoCompra.esRetroactivo;
    const periodoAnio   = esRetroactivo ? periodoCompra.periodoAnio : undefined;
    const periodoMes    = esRetroactivo ? periodoCompra.periodoMes  : undefined;

    let contraAsientos = 0;

    for (const item of compra.items) {
      const recibido = new Prisma.Decimal(item.cantidadRecibida ?? 0);
      if (recibido.lte(0)) continue;

      if (esRetroactivo) {
        // Contra-asiento retroactivo: revierte SaldoMensual, NO toca Stock actual
        const saldo = await prisma.saldoMensual.findUnique({
          where: { productoId_anio_mes: { productoId: item.productoId, anio: periodoAnio!, mes: periodoMes! } },
        });

        const stockAntes   = saldo ? new Prisma.Decimal(saldo.saldoFinal) : new Prisma.Decimal(0);
        const stockDespues = stockAntes.sub(recibido);
        const precioUnit   = new Prisma.Decimal(item.precioUnit);

        await prisma.movimiento.create({
          data: {
            operationId: randomUUID(),
            productoId: item.productoId,
            tipo: "SALIDA",
            cantidad: recibido,
            precioUnit,
            entradaBs: 0,
            salidaBs: precioUnit.mul(recibido),
            saldoBs: stockDespues.mul(precioUnit),
            stockAntes,
            stockDespues,
            usuarioId: userId,
            referencia: "ANULACION_COMPRA",
            referenciaId: id,
            esRetroactivo: true,
            periodoAnio: periodoAnio ?? null,
            periodoMes:  periodoMes  ?? null,
            createdAt: compra.fechaOperacion ?? new Date(),
          },
        });

        if (saldo) {
          const nuevoIngreso   = new Prisma.Decimal(saldo.ingresoQty).sub(recibido);
          const nuevoFinal     = new Prisma.Decimal(saldo.saldoFinal).sub(recibido);
          const precioSaldo    = new Prisma.Decimal(saldo.precioUnit);
          const newIngresosBs  = Prisma.Decimal.max(
            new Prisma.Decimal((saldo as any).ingresosBs ?? 0).sub(precioUnit.mul(recibido)),
            new Prisma.Decimal(0),
          );
          const newPrecioUnitProm = nuevoIngreso.gt(0) ? newIngresosBs.div(nuevoIngreso) : new Prisma.Decimal(0);
          await prisma.saldoMensual.update({
            where: { id: saldo.id },
            data: {
              ingresoQty:     nuevoIngreso,
              saldoFinal:     nuevoFinal,
              totalBs:        nuevoFinal.mul(precioSaldo),
              ingresosBs:     newIngresosBs,
              precioUnitProm: newPrecioUnitProm,
              totalBsProm:    nuevoFinal.mul(newPrecioUnitProm),
            } as any,
          });
        }
      } else {
        // Contra-asiento normal: descuenta stock físico
        const stock = item.producto.stock;
        if (!stock) continue;

        const precioUnit   = new Prisma.Decimal(item.precioUnit);
        const stockDespues = new Prisma.Decimal(stock.cantidad).sub(recibido);

        await prisma.movimiento.create({
          data: {
            operationId: randomUUID(),
            productoId: item.productoId,
            tipo: "SALIDA",
            cantidad: recibido,
            precioUnit,
            entradaBs: 0,
            salidaBs: precioUnit.mul(recibido),
            saldoBs: stockDespues.mul(precioUnit),
            stockAntes: stock.cantidad,
            stockDespues,
            usuarioId: userId,
            referencia: "ANULACION_COMPRA",
            referenciaId: id,
          },
        });

        await prisma.stock.update({
          where: { productoId: item.productoId },
          data: { cantidad: { decrement: recibido } },
        });
      }

      contraAsientos++;
    }

    const [compraAnulada, anulacion] = await prisma.$transaction([
      prisma.compra.update({
        where: { id },
        data: { estado: "ANULADA" },
        include: {
          proveedor: true,
          usuarioRegistro: { select: { id: true, nombre: true, email: true } },
          items: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
        },
      }),
      prisma.anulacionCompra.create({
        data: { compraId: id, usuarioId: userId, motivo },
        include: { usuario: { select: { id: true, nombre: true, email: true } } },
      }),
    ]);

    await prisma.log.create({
      data: { usuarioId: userId, accion: "ANULAR_COMPRA", data: { compraId: id, motivo, contraAsientos, esRetroactivo } },
    });

    logger.info({ userId, compraId: id, contraAsientos, esRetroactivo }, "Compra anulada");
    return { compra: compraAnulada, anulacion, contraAsientos };
  },

  async getAnulaciones() {
    return prisma.anulacionCompra.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
        compra: {
          select: {
            id: true,
            createdAt: true,
            numeroFactura: true,
            proveedor: { select: { id: true, nombre: true } },
          },
        },
      },
    });
  },
};
