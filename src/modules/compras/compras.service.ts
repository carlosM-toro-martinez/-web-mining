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
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ usuarioRegistroId: userId }, { usuarioRecibidoId: userId }],
    };

    if (query.estado) {
      where.estado = query.estado;
    }

    if (query.proveedorId) {
      where.proveedorId = query.proveedorId;
    }

    const [compras, total] = await Promise.all([
      prisma.compra.findMany({
        where,
        skip,
        take: limit,
        include: {
          proveedor: true,
          usuarioRegistro: { select: { id: true, nombre: true, email: true } },
          usuarioRecibe: { select: { id: true, nombre: true, email: true } },
          items: {
            include: {
              producto: {
                include: {
                  stock: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.compra.count({ where }),
    ]);

    return {
      compras,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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
      throw new HttpError("La compra ya está completada", 409);
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

          const nuevoIngreso = new Prisma.Decimal(saldo?.ingresoQty ?? 0).add(cantidadRecibidaAhora);
          const nuevoFinal = new Prisma.Decimal(saldo?.saldoFinal ?? 0).add(cantidadRecibidaAhora);
          const precioSaldo = saldo ? new Prisma.Decimal(saldo.precioUnit) : new Prisma.Decimal(precioUnit);
          await prisma.saldoMensual.upsert({
            where: { productoId_anio_mes: { productoId: item.productoId, anio: periodoAnio!, mes: periodoMes! } },
            update: { ingresoQty: nuevoIngreso, saldoFinal: nuevoFinal, totalBs: nuevoFinal.mul(precioSaldo) },
            create: {
              productoId: item.productoId, anio: periodoAnio!, mes: periodoMes!,
              saldoInicial: 0, salidaQty: 0,
              ingresoQty: cantidadRecibidaAhora, saldoFinal: nuevoFinal,
              precioUnit: precioSaldo, totalBs: nuevoFinal.mul(precioSaldo),
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
};
