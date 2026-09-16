import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { generarFolioRendicionCaja } from "../../utils/correlativo.js";
import type { AnularRendicionCajaDTO, CreateRendicionCajaDTO } from "./rendicionCaja.types.js";
import type { z } from "zod";
import type { rendicionCajaQuerySchema } from "./rendicionCaja.schema.js";

type RendicionCajaQuery = z.infer<typeof rendicionCajaQuerySchema>;

const INCLUDE_DETALLE = {
  caja: true,
  detalleGastos: { include: { gasto: true } },
  anulacion: true,
} as const;

export const rendicionCajaService = {
  async getAll(query: RendicionCajaQuery) {
    const where: any = {};
    if (query.cajaId) where.cajaId = query.cajaId;
    if (query.estado) where.estado = query.estado;

    return prisma.rendicionCaja.findMany({
      where,
      include: { caja: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.rendicionCaja.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  },

  // Misma lectura que create() (gastos elegibles, fondos, saldo
  // anterior/nuevo) pero sin escribir nada ni gastar un folio — para que el
  // usuario vea qué incluiría la rendición del período antes de decidirse a
  // crearla de verdad.
  async preview(cajaId: number, periodoDesde: Date, periodoHasta: Date) {
    const caja = await prisma.cajaChica.findUnique({ where: { id: cajaId } });
    if (!caja) throw new HttpError("Caja chica no encontrada", 404);

    const [gastosElegibles, fondos, fondosBanco, ultimaCerrada] = await Promise.all([
      prisma.gastoCaja.findMany({
        where: { cajaId, estado: "REGISTRADO", fecha: { gte: periodoDesde, lte: periodoHasta } },
        orderBy: { fecha: "asc" },
      }),
      prisma.movimientoFondoCaja.aggregate({
        where: { cajaId, fecha: { gte: periodoDesde, lte: periodoHasta } },
        _sum: { monto: true },
      }),
      prisma.movimientoBancoCaja.aggregate({
        where: { cajaId, tipo: "SALIDA_A_CAJA", fecha: { gte: periodoDesde, lte: periodoHasta } },
        _sum: { monto: true },
      }),
      prisma.rendicionCaja.findFirst({
        where: { cajaId, estado: "CERRADO" },
        orderBy: { periodoHasta: "desc" },
      }),
    ]);

    const totalFondos = Number(fondos._sum.monto ?? 0) + Number(fondosBanco._sum.monto ?? 0);
    const totalGastos = gastosElegibles.reduce((acc, g) => acc + Number(g.montoTotal), 0);
    const totalRetenciones = gastosElegibles.reduce(
      (acc, g) =>
        acc + Number(g.montoRetencionRcIva) + Number(g.montoRetencionIueCompras) + Number(g.montoRetencionIt),
      0,
    );
    const totalCreditoFiscal = gastosElegibles.reduce((acc, g) => acc + Number(g.montoCreditoFiscalIva), 0);
    const saldoAnterior = ultimaCerrada ? Number(ultimaCerrada.saldoNuevo) : Number(caja.saldoInicial);
    const saldoNuevo = saldoAnterior + totalFondos - totalGastos;

    return {
      caja,
      gastos: gastosElegibles,
      totalFondos,
      totalGastos,
      totalRetenciones,
      totalCreditoFiscal,
      saldoAnterior,
      saldoNuevo,
    };
  },

  // Arma el detalle desde los gastos REGISTRADO de la caja en el rango de
  // fechas, y calcula saldoAnterior a partir de la última rendición
  // CERRADA de la misma caja (0 si es la primera) — mismo esquema
  // "saldo deudor/acreedor" de los reportes reales de Caja Lipeña.
  async create(data: CreateRendicionCajaDTO, userId: number) {
    const caja = await prisma.cajaChica.findUnique({ where: { id: data.cajaId } });
    if (!caja) throw new HttpError("Caja chica no encontrada", 404);

    const gastosElegibles = await prisma.gastoCaja.findMany({
      where: {
        cajaId: data.cajaId,
        estado: "REGISTRADO",
        fecha: { gte: data.periodoDesde, lte: data.periodoHasta },
      },
    });

    if (gastosElegibles.length === 0) {
      throw new HttpError("No hay gastos registrados de esta caja en el rango de fechas indicado", 400);
    }

    const [fondos, fondosBanco, ultimaCerrada] = await Promise.all([
      prisma.movimientoFondoCaja.aggregate({
        where: { cajaId: data.cajaId, fecha: { gte: data.periodoDesde, lte: data.periodoHasta } },
        _sum: { monto: true },
      }),
      prisma.movimientoBancoCaja.aggregate({
        where: {
          cajaId: data.cajaId,
          tipo: "SALIDA_A_CAJA",
          fecha: { gte: data.periodoDesde, lte: data.periodoHasta },
        },
        _sum: { monto: true },
      }),
      prisma.rendicionCaja.findFirst({
        where: { cajaId: data.cajaId, estado: "CERRADO" },
        orderBy: { periodoHasta: "desc" },
      }),
    ]);

    const totalFondos = Number(fondos._sum.monto ?? 0) + Number(fondosBanco._sum.monto ?? 0);
    const totalGastos = gastosElegibles.reduce((acc, g) => acc + Number(g.montoTotal), 0);
    const totalRetenciones = gastosElegibles.reduce(
      (acc, g) =>
        acc + Number(g.montoRetencionRcIva) + Number(g.montoRetencionIueCompras) + Number(g.montoRetencionIt),
      0,
    );
    const totalCreditoFiscal = gastosElegibles.reduce((acc, g) => acc + Number(g.montoCreditoFiscalIva), 0);
    const saldoAnterior = ultimaCerrada ? Number(ultimaCerrada.saldoNuevo) : Number(caja.saldoInicial);
    const saldoNuevo = saldoAnterior + totalFondos - totalGastos;

    const rendicion = await prisma.$transaction(async (tx) => {
      const numero = await generarFolioRendicionCaja(tx, caja.codigo, data.periodoHasta);

      // El folio se calcula solo del mes (no es un correlativo), así que
      // puede repetirse con una rendición ya ANULADA del mismo mes — eso es
      // correcto, la anulada no cuenta. Lo que sí bloqueamos es que dos
      // rendiciones ACTIVAS de la misma caja compartan folio.
      const conflicto = await tx.rendicionCaja.findFirst({
        where: { cajaId: data.cajaId, numero, estado: { not: "ANULADO" } },
      });
      if (conflicto) {
        throw new HttpError(
          `Ya existe una rendición activa (${conflicto.numero}) para este período en esta caja.`,
          409,
        );
      }

      const creada = await tx.rendicionCaja.create({
        data: {
          cajaId: data.cajaId,
          periodoDesde: data.periodoDesde,
          periodoHasta: data.periodoHasta,
          numero,
          tipoCambio: data.tipoCambio,
          totalFondos,
          totalGastos,
          totalRetenciones,
          totalCreditoFiscal,
          saldoAnterior,
          saldoNuevo,
          usuarioId: userId,
          detalleGastos: {
            create: gastosElegibles.map((g) => ({ gastoId: g.id, montoIncluido: g.montoTotal })),
          },
        },
        include: INCLUDE_DETALLE,
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "CREATE_RENDICION_CAJA",
          data: { rendicionId: creada.id, cajaId: data.cajaId, gastosIncluidos: gastosElegibles.length },
        },
      });

      return creada;
    });

    logger.info(
      { userId, rendicionId: rendicion.id, action: "CREATE_RENDICION_CAJA" },
      "Rendición de caja creada en borrador",
    );

    return rendicion;
  },

  // Compare-and-swap con updateMany, igual que en liquidacion.service.ts.
  async cerrar(id: string, userId: number) {
    return prisma.$transaction(async (tx) => {
      const rendicion = await tx.rendicionCaja.findUnique({
        where: { id },
        include: { detalleGastos: true },
      });
      if (!rendicion) throw new HttpError("Rendición no encontrada", 404);
      if (rendicion.estado !== "BORRADOR") {
        throw new HttpError("Solo se puede cerrar una rendición en BORRADOR", 409);
      }

      // No cerrar con gastos a medio clasificar — el comprobante de diario
      // necesita la cuenta/centro/función/partida ya resueltos. Se pueden
      // completar editando el gasto (mientras siga REGISTRADO) antes de
      // volver a intentar el cierre.
      const gastosIncompletos = await tx.gastoCaja.count({
        where: {
          id: { in: rendicion.detalleGastos.map((d) => d.gastoId) },
          OR: [
            { centroCostoCajaId: null },
            { funcionGastoCajaId: null },
            { cuentaContableCajaId: null },
            { partidaPresupuestoId: null },
          ],
        },
      });
      if (gastosIncompletos > 0) {
        throw new HttpError(
          `No se puede cerrar: ${gastosIncompletos} gasto(s) de esta rendición tienen información incompleta (falta centro de costo, función de gasto, cuenta contable o partida de presupuesto). Complétalos en "Gastos" antes de cerrar.`,
          409,
        );
      }

      const resultado = await tx.rendicionCaja.updateMany({
        where: { id, estado: "BORRADOR" },
        data: { estado: "CERRADO" },
      });
      if (resultado.count === 0) {
        throw new HttpError("La rendición ya fue cerrada por otra operación", 409);
      }

      await tx.gastoCaja.updateMany({
        where: { id: { in: rendicion.detalleGastos.map((d) => d.gastoId) } },
        data: { estado: "RENDIDO" },
      });

      await tx.log.create({
        data: { usuarioId: userId, accion: "CERRAR_RENDICION_CAJA", data: { rendicionId: id } },
      });

      return tx.rendicionCaja.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });
  },

  // Anular una rendición CERRADA revierte los gastos incluidos a
  // REGISTRADO, igual que anular una liquidación revierte lotes a ACOPIADO.
  async anular(id: string, data: AnularRendicionCajaDTO, userId: number) {
    return prisma.$transaction(async (tx) => {
      const rendicion = await tx.rendicionCaja.findUnique({
        where: { id },
        include: { detalleGastos: true },
      });
      if (!rendicion) throw new HttpError("Rendición no encontrada", 404);
      if (rendicion.estado === "ANULADO") throw new HttpError("La rendición ya está anulada", 409);

      if (rendicion.estado === "CERRADO") {
        await tx.gastoCaja.updateMany({
          where: { id: { in: rendicion.detalleGastos.map((d) => d.gastoId) }, estado: "RENDIDO" },
          data: { estado: "REGISTRADO" },
        });
      }

      await tx.rendicionCaja.update({ where: { id }, data: { estado: "ANULADO" } });
      await tx.anulacionRendicionCaja.create({
        data: { rendicionId: id, usuarioId: userId, motivo: data.motivo },
      });

      await tx.log.create({
        data: {
          usuarioId: userId,
          accion: "ANULAR_RENDICION_CAJA",
          data: { rendicionId: id, motivo: data.motivo },
        },
      });

      return tx.rendicionCaja.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });
  },
};
