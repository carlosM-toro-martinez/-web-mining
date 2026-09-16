import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../errors/http.error.js";
import { obtenerSaldoActualCuentaBancaria } from "../cuentaBancariaCaja/cuentaBancariaCaja.service.js";
import { reportesCajaChicaService } from "../reportesCajaChica/reportesCajaChica.service.js";
import type { AnularGastoCajaDTO, CreateGastoCajaDTO } from "./gastoCaja.types.js";
import type { z } from "zod";
import type { gastoCajaQuerySchema } from "./gastoCaja.schema.js";

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
// RECIBO_DIRECTO      -> 100% a Gastos No Deducibles, sin créditos ni retenciones.
async function calcularImpuestos(data: CreateGastoCajaDTO) {
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
  } else {
    esNoDeducible = true;
  }

  return { montoCreditoFiscalIva, montoRetencionRcIva, montoRetencionIueCompras, montoRetencionIt, esNoDeducible };
}

export const gastoCajaService = {
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
        },
        orderBy: { fecha: "desc" },
      }),
      prisma.gastoCaja.count({ where }),
    ]);

    return { gastos, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id: string) {
    return prisma.gastoCaja.findUnique({ where: { id }, include: INCLUDE_DETALLE });
  },

  async create(data: CreateGastoCajaDTO, userId: number) {
    const [caja, cuentaBancariaCaja, centroCosto, funcionGasto, cuentaManual, partidaPresupuesto] = await Promise.all([
      data.origen === "CAJA" && data.cajaId ? prisma.cajaChica.findUnique({ where: { id: data.cajaId } }) : null,
      data.origen === "BANCO" && data.cuentaBancariaCajaId
        ? prisma.cuentaBancariaCaja.findUnique({ where: { id: data.cuentaBancariaCajaId } })
        : null,
      prisma.centroCostoCaja.findUnique({ where: { id: data.centroCostoCajaId } }),
      prisma.funcionGastoCaja.findUnique({ where: { id: data.funcionGastoCajaId } }),
      prisma.cuentaContableCaja.findUnique({ where: { id: data.cuentaContableCajaId } }),
      prisma.partidaPresupuestoCaja.findUnique({ where: { id: data.partidaPresupuestoId } }),
    ]);

    if (data.origen === "CAJA" && !caja) throw new HttpError("Caja chica no encontrada", 404);
    if (data.origen === "BANCO" && !cuentaBancariaCaja) throw new HttpError("Cuenta bancaria no encontrada", 404);
    if (!centroCosto) throw new HttpError("Centro de costo no encontrado", 404);
    if (!funcionGasto) throw new HttpError("Función de gasto no encontrada", 404);
    if (!cuentaManual) throw new HttpError("Cuenta contable no encontrada", 404);
    if (!partidaPresupuesto) throw new HttpError("Partida de presupuesto no encontrada", 404);

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
          centroCostoCajaId: data.centroCostoCajaId,
          funcionGastoCajaId: data.funcionGastoCajaId,
          cuentaContableCajaId: data.cuentaContableCajaId,
          partidaPresupuestoId: data.partidaPresupuestoId,
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

    return gasto;
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
