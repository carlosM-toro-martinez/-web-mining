import { prisma } from "../../config/prisma.js";
import type { CreateCajaChicaDTO, UpdateCajaChicaDTO } from "./cajaChica.types.js";
import type { z } from "zod";
import type { cajaChicaQuerySchema } from "./cajaChica.schema.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";

type CajaChicaQuery = z.infer<typeof cajaChicaQuerySchema>;

export const cajaChicaService = {
  async getAll(query: CajaChicaQuery) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { nombre: { contains: String(query.search), mode: "insensitive" as const } },
        { codigo: { contains: String(query.search), mode: "insensitive" as const } },
      ];
    }

    if (query.soloActivas) where.activo = true;

    return prisma.cajaChica.findMany({ where, orderBy: { codigo: "asc" } });
  },

  async getById(id: number) {
    return prisma.cajaChica.findUnique({ where: { id } });
  },

  async create(data: CreateCajaChicaDTO, userId: number) {
    const caja = await prisma.cajaChica.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        monedaBase: data.monedaBase ?? "BOB",
        saldoInicial: data.saldoInicial ?? 0,
        encargadoNombre: data.encargadoNombre ?? null,
        encargadoUsuarioId: data.encargadoUsuarioId ?? null,
        activo: data.activo ?? true,
      },
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "CREATE_CAJA_CHICA", data: { cajaId: caja.id, ...data } },
    });

    logger.info({ userId, cajaId: caja.id, action: "CREATE_CAJA_CHICA" }, "Caja chica creada");

    return caja;
  },

  async update(id: number, data: UpdateCajaChicaDTO, userId: number) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as any;

    const caja = await prisma.cajaChica.update({ where: { id }, data: cleanData });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "UPDATE_CAJA_CHICA", data: { cajaId: id, ...cleanData } },
    });

    logger.info({ userId, cajaId: id, action: "UPDATE_CAJA_CHICA" }, "Caja chica actualizada");

    return caja;
  },

  async remove(id: number, userId: number) {
    const caja = await prisma.cajaChica.findUnique({
      where: { id },
      include: {
        _count: {
          select: { gastos: true, movimientosFondo: true, rendiciones: true, movimientosBanco: true, partidasPresupuesto: true },
        },
      },
    });

    if (!caja) {
      throw new HttpError("La caja ya no existe.", 404);
    }

    const totalMovimientos =
      caja._count.gastos +
      caja._count.movimientosFondo +
      caja._count.rendiciones +
      caja._count.movimientosBanco +
      caja._count.partidasPresupuesto;

    if (totalMovimientos > 0) {
      throw new HttpError(
        "No se puede eliminar: esta caja ya tiene gastos, movimientos, rendiciones o partidas de presupuesto registrados.",
        409,
      );
    }

    await prisma.cajaChica.delete({ where: { id } });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "DELETE_CAJA_CHICA", data: { cajaId: id } },
    });

    logger.info({ userId, cajaId: id, action: "DELETE_CAJA_CHICA" }, "Caja chica eliminada");
  },

  // Borra TODO lo transaccional de Caja Chica (de todas las cajas): gastos,
  // rendiciones, movimientos de fondo y de banco, partidas de presupuesto, y
  // reinicia los correlativos de folio. NO toca cajas, cuentas bancarias,
  // ni ningún catálogo (centros de costo, funciones de gasto, cuentas
  // contables, tasas de retención) — eso se conserva siempre. Pensado para
  // "reiniciar" el módulo y volver a probar/usar desde cero sin perder la
  // configuración. Reservado solo al rol ADMIN por lo irreversible que es.
  async resetTransaccional(userId: number) {
    const resultado = await prisma.$transaction(async (tx) => {
      const anulacionesRendicion = await tx.anulacionRendicionCaja.deleteMany({});
      const detalleGastos = await tx.rendicionDetalleGasto.deleteMany({});
      const anulacionesGasto = await tx.anulacionGastoCaja.deleteMany({});
      const rendiciones = await tx.rendicionCaja.deleteMany({});
      const gastos = await tx.gastoCaja.deleteMany({});
      const movimientosBanco = await tx.movimientoBancoCaja.deleteMany({});
      const movimientosFondo = await tx.movimientoFondoCaja.deleteMany({});
      const partidas = await tx.partidaPresupuestoCaja.deleteMany({});
      const correlativos = await tx.correlativoContador.deleteMany({
        where: { clave: { startsWith: "RENDICION_CAJA_" } },
      });

      return {
        anulacionesRendicion: anulacionesRendicion.count,
        detalleGastos: detalleGastos.count,
        anulacionesGasto: anulacionesGasto.count,
        rendiciones: rendiciones.count,
        gastos: gastos.count,
        movimientosBanco: movimientosBanco.count,
        movimientosFondo: movimientosFondo.count,
        partidas: partidas.count,
        correlativos: correlativos.count,
      };
    });

    await prisma.log.create({
      data: { usuarioId: userId, accion: "RESET_TRANSACCIONAL_CAJA_CHICA", data: resultado },
    });

    logger.warn(
      { userId, action: "RESET_TRANSACCIONAL_CAJA_CHICA", ...resultado },
      "Se reiniciaron TODOS los registros transaccionales de Caja Chica",
    );

    return resultado;
  },
};
